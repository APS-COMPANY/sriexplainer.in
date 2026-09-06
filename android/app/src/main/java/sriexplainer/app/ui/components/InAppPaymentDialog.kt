package sriexplainer.app.ui.components

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.launch
import sriexplainer.app.data.repository.SeriesRepository
import sriexplainer.app.ui.theme.*

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun InAppPaymentDialog(
    planKey: String,
    amount: Int,
    token: String?,
    onDismiss: () -> Unit,
    onPaymentSuccess: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val repository = remember { SeriesRepository() }

    var isCreatingOrder by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var paymentSessionId by remember { mutableStateOf<String?>(null) }
    var orderId by remember { mutableStateOf<String?>(null) }
    var environment by remember { mutableStateOf("PRODUCTION") }
    var paymentVerified by remember { mutableStateOf(false) }

    fun initializePayment() {
        if (token.isNullOrBlank()) {
            errorMessage = "Please sign in to complete payment."
            isCreatingOrder = false
            return
        }
        isCreatingOrder = true
        errorMessage = null
        coroutineScope.launch {
            val result = repository.createCashfreeOrder(token, planKey, amount)
            result.fold(
                onSuccess = { resp ->
                    if (!resp.paymentSessionId.isNullOrBlank()) {
                        paymentSessionId = resp.paymentSessionId
                        orderId = resp.orderId
                        environment = resp.environment ?: "PRODUCTION"
                        isCreatingOrder = false
                    } else {
                        errorMessage = resp.message ?: "Could not initialize payment gateway."
                        isCreatingOrder = false
                    }
                },
                onFailure = { err ->
                    errorMessage = err.message ?: "Unable to connect to payment server."
                    isCreatingOrder = false
                }
            )
        }
    }

    LaunchedEffect(planKey, amount) {
        initializePayment()
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(BgDark)
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Top Navigation Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(CardSurface)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(BrandPurple.copy(alpha = 0.25f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Security,
                                contentDescription = null,
                                tint = BrandPurpleLight,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Pay ₹$amount • Cashfree & Paytm",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Lock,
                                    contentDescription = null,
                                    tint = StarGold,
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "100% Direct In-App Payment",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )
                            }
                        }
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(CardSurfaceVariant)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = TextPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                // Loading State (Connecting to Cashfree directly)
                if (isCreatingOrder) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(BgDark),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(24.dp)
                        ) {
                            CircularProgressIndicator(
                                color = BrandPurple,
                                strokeWidth = 3.dp,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(20.dp))
                            Text(
                                text = "Opening Secure Gateway...",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Preparing Paytm, PhonePe, Google Pay & UPI checkout",
                                fontSize = 12.sp,
                                color = TextMuted
                            )
                        }
                    }
                } else if (errorMessage != null) {
                    // Error State with Retry
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(BgDark)
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "Payment Initialization Failed",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFFF8A80)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = errorMessage ?: "Unknown error occurred",
                                fontSize = 13.sp,
                                color = TextMuted,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Row {
                                OutlinedButton(
                                    onClick = onDismiss,
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Text("Cancel")
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Button(
                                    onClick = { initializePayment() },
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandPurple),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Try Again")
                                }
                            }
                        }
                    }
                } else if (!paymentSessionId.isNullOrBlank()) {
                    // Standalone Cashfree Gateway Checkout (Zero website interface!)
                    val mode = if (environment.equals("PRODUCTION", ignoreCase = true)) "production" else "sandbox"
                    val checkoutHtml = remember(paymentSessionId, mode) {
                        """
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="utf-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                          <title>Cashfree Checkout</title>
                          <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
                          <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body {
                              background-color: #0b0b0f;
                              color: #ffffff;
                              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                              display: flex;
                              flex-direction: column;
                              align-items: center;
                              justify-content: center;
                              min-height: 100vh;
                              padding: 24px;
                            }
                            .spinner {
                              width: 44px;
                              height: 44px;
                              border: 3px solid rgba(139, 92, 246, 0.2);
                              border-top-color: #8b5cf6;
                              border-radius: 50%;
                              animation: spin 0.8s linear infinite;
                              margin-bottom: 16px;
                            }
                            @keyframes spin { to { transform: rotate(360deg); } }
                            .title { font-size: 16px; font-weight: bold; margin-bottom: 6px; color: #ffffff; }
                            .sub { font-size: 13px; color: #a1a1aa; text-align: center; }
                          </style>
                        </head>
                        <body>
                          <div class="spinner"></div>
                          <div class="title">Connecting to Cashfree</div>
                          <div class="sub">Opening Paytm, PhonePe, GPay & UPI payment sheet...</div>
                          <script>
                            window.addEventListener('DOMContentLoaded', function() {
                              try {
                                if (typeof Cashfree !== 'undefined') {
                                  const cashfree = Cashfree({ mode: "$mode" });
                                  cashfree.checkout({
                                    paymentSessionId: "$paymentSessionId",
                                    redirectTarget: "_self"
                                  });
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            });
                          </script>
                        </body>
                        </html>
                        """.trimIndent()
                    }

                    AndroidView(
                        factory = { ctx ->
                            WebView(ctx).apply {
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                settings.apply {
                                    javaScriptEnabled = true
                                    domStorageEnabled = true
                                    useWideViewPort = true
                                    loadWithOverviewMode = true
                                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                    cacheMode = WebSettings.LOAD_DEFAULT
                                    userAgentString = "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 SriExplainerApp/1.0"
                                }
                                webViewClient = object : WebViewClient() {
                                    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                                        val url = request?.url?.toString() ?: return false

                                        // Intercept native UPI & Paytm payment apps
                                        if (url.startsWith("upi://") ||
                                            url.startsWith("paytmmp://") ||
                                            url.startsWith("phonepe://") ||
                                            url.startsWith("gpay://") ||
                                            url.startsWith("tez://") ||
                                            url.startsWith("bhim://") ||
                                            url.startsWith("intent://")
                                        ) {
                                            try {
                                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                                context.startActivity(intent)
                                            } catch (_: Exception) {
                                                Toast.makeText(context, "No UPI app found on device", Toast.LENGTH_SHORT).show()
                                            }
                                            return true
                                        }

                                        // Detect payment completion & return
                                        if (url.contains("order_id=") || url.contains("/profile") || url.contains("status=SUCCESS") || url.contains("status=PAID")) {
                                            if (!paymentVerified) {
                                                paymentVerified = true
                                                val uri = Uri.parse(url)
                                                val finalOrderId = uri.getQueryParameter("order_id") ?: orderId ?: ""
                                                if (!token.isNullOrBlank() && finalOrderId.isNotBlank()) {
                                                    coroutineScope.launch {
                                                        repository.verifyPayment(token, finalOrderId)
                                                        onPaymentSuccess()
                                                    }
                                                } else {
                                                    onPaymentSuccess()
                                                }
                                            }
                                            return true
                                        }

                                        return false
                                    }
                                }
                                webChromeClient = WebChromeClient()
                                loadDataWithBaseURL("https://sriexplainer.in", checkoutHtml, "text/html", "UTF-8", null)
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
    }
}
