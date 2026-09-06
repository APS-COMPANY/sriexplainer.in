package sriexplainer.app.ui.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import sriexplainer.app.ui.theme.*

data class CoinPackage(
    val key: String,
    val coins: Int,
    val price: Int,
    val badge: String?,
    val isPopular: Boolean,
    val perks: List<String>
)

val availablePackages = listOf(
    CoinPackage(
        key = "60_coins",
        coins = 60,
        price = 29,
        badge = "Starter Pack",
        isPopular = false,
        perks = listOf("Unlock up to 12 Paid Episodes", "Instant Balance Credit", "Permanent Unlocks")
    ),
    CoinPackage(
        key = "110_coins",
        coins = 110,
        price = 49,
        badge = "Most Popular",
        isPopular = true,
        perks = listOf("Unlock up to 22 Paid Episodes", "Best Value per Coin", "Instant Balance Credit")
    ),
    CoinPackage(
        key = "220_coins",
        coins = 220,
        price = 99,
        badge = "Mega Value",
        isPopular = false,
        perks = listOf("Unlock up to 44 Paid Episodes", "Maximum Coin Savings", "Full 4K & HD Access")
    )
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionBottomSheet(
    onDismiss: () -> Unit,
    userXpCoins: Int = 0,
    isLoggedIn: Boolean = false,
    onLoginRequired: () -> Unit = {},
    onPlanSelected: (CoinPackage) -> Unit
) {
    val context = LocalContext.current
    var selectedPackage by remember { mutableStateOf(availablePackages[1]) } // Default to 49 plan
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = CardSurface,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextMuted) },
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 36.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Crown / Diamond Icon
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(BrandPurple, BrandPurpleDark)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Diamond,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Heading
            Text(
                text = "Sri Explainer VIP & Coins",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black,
                color = TextPrimary
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "Pay once per episode — re-watch permanently",
                fontSize = 13.sp,
                color = TextMuted
            )

            // Current Balance Badge
            if (isLoggedIn) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(CardSurfaceVariant)
                        .border(1.dp, BorderDark, RoundedCornerShape(20.dp))
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Your Balance: ",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                    Text(
                        text = "$userXpCoins XP Coins",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = StarGold
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Package Cards
            availablePackages.forEach { pkg ->
                val isSelected = selectedPackage.key == pkg.key
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (isSelected) CardSurfaceVariant else CardSurface)
                        .border(
                            width = if (isSelected) 2.dp else 1.dp,
                            color = if (isSelected) BrandPurpleLight else BorderDark,
                            shape = RoundedCornerShape(16.dp)
                        )
                        .clickable { selectedPackage = pkg }
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            if (pkg.badge != null) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(if (pkg.isPopular) BrandPurple else BorderDark)
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = pkg.badge.uppercase(),
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                            }

                            Text(
                                text = "${pkg.coins} XP Coins",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )

                            Spacer(modifier = Modifier.height(2.dp))

                            Text(
                                text = pkg.perks.firstOrNull() ?: "",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }

                        // Price
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "₹${pkg.price}",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Black,
                                color = if (isSelected) BrandPurpleLight else TextPrimary
                            )
                            Text(
                                text = "One-time",
                                fontSize = 10.sp,
                                color = TextMuted
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Payment Gateways Notice (Cashfree / Paytm UPI)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF0D1526))
                    .border(1.dp, Color(0xFF1E3A8A).copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                    .padding(12.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = null,
                        tint = Color(0xFF60A5FA),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Cashfree Payments & Paytm UPI",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Supports Paytm, PhonePe, Google Pay, UPI & Cards",
                            fontSize = 11.sp,
                            color = Color(0xFF93C5FD)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Primary Pay Button (In-App Checkout)
            Button(
                onClick = {
                    if (!isLoggedIn) {
                        onDismiss()
                        onLoginRequired()
                    } else {
                        onPlanSelected(selectedPackage)
                        onDismiss()
                    }
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandPurple,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Text(
                    text = if (isLoggedIn) "Pay ₹${selectedPackage.price} with Cashfree / Paytm" else "Sign In to Buy Coins",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Guarantee perks
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                PerkItem("Instant Credit")
                PerkItem("Coins Never Expire")
                PerkItem("100% Safe")
            }
        }
    }
}

@Composable
fun PerkItem(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = Icons.Default.Check,
            contentDescription = null,
            tint = BrandPurpleLight,
            modifier = Modifier.size(13.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = text,
            fontSize = 11.sp,
            color = TextMuted
        )
    }
}
