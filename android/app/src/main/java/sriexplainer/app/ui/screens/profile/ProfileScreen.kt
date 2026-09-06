package sriexplainer.app.ui.screens.profile

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import kotlinx.coroutines.launch
import sriexplainer.app.R
import sriexplainer.app.data.local.UserSessionManager
import sriexplainer.app.data.repository.SeriesRepository
import sriexplainer.app.BuildConfig
import sriexplainer.app.data.model.AppUpdateInfo
import sriexplainer.app.ui.components.AppUpdateDialog
import sriexplainer.app.ui.components.InAppPaymentDialog
import sriexplainer.app.ui.components.SubscriptionBottomSheet
import sriexplainer.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val sessionManager = remember { UserSessionManager.getInstance(context) }
    val currentUser by sessionManager.currentUser.collectAsState()
    val repository = remember { SeriesRepository() }
    val watchlistManager = remember { sriexplainer.app.data.local.WatchlistManager.getInstance(context) }
    val watchlist by watchlistManager.watchlist.collectAsState()

    var manualUpdateInfo by remember { mutableStateOf<AppUpdateInfo?>(null) }
    var isCheckingUpdate by remember { mutableStateOf(false) }

    var showLoginSheet by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showSubscriptionSheet by remember { mutableStateOf(false) }
    var activeCheckoutPlan by remember { mutableStateOf<sriexplainer.app.ui.components.CoinPackage?>(null) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
            .statusBarsPadding(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp)
    ) {
        // 1. Profile / Login Header Card
        item {
            val user = currentUser
            if (user == null) {
                // Logged-out Guest Card with Sign-In CTA
                GuestProfileCard(
                    onLoginClick = { showLoginSheet = true }
                )
            } else {
                // Logged-in Authenticated User Card
                AuthenticatedUserCard(
                    user = user,
                    onLogoutClick = { showLogoutDialog = true }
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        // 2. Preferences
        item {
            Text(
                text = "Preferences",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
            Spacer(modifier = Modifier.height(10.dp))

            SettingsItem(
                icon = Icons.Default.Diamond,
                title = "VIP Subscriptions & Coins",
                subtitle = "Paytm UPI & Cashfree (from ₹29)",
                iconColor = StarGold,
                onClick = { showSubscriptionSheet = true }
            )

            SettingsItem(
                icon = Icons.Default.History,
                title = "Watch History",
                subtitle = "Continue where you left off",
                onClick = {
                    Toast.makeText(context, "Watch history synced with your account", Toast.LENGTH_SHORT).show()
                }
            )

            SettingsItem(
                icon = Icons.Default.Bookmark,
                title = "My Watchlist",
                subtitle = "${watchlist.size} series bookmarked",
                onClick = {
                    Toast.makeText(context, "${watchlist.size} series in your watchlist. Visible on Home screen!", Toast.LENGTH_SHORT).show()
                }
            )

            SettingsItem(
                icon = Icons.Default.Download,
                title = "Downloads & Offline",
                subtitle = "Saved episodes for offline travel",
                onClick = {
                    Toast.makeText(context, "Offline downloads coming soon!", Toast.LENGTH_SHORT).show()
                }
            )

            SettingsItem(
                icon = Icons.Default.Language,
                title = "Official Website",
                subtitle = "https://sriexplainer.in",
                onClick = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://sriexplainer.in"))
                    context.startActivity(intent)
                }
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Community & Support",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
            Spacer(modifier = Modifier.height(10.dp))

            SettingsItem(
                icon = Icons.Default.Send,
                title = "Telegram Channel",
                subtitle = "Get latest episode alerts & updates",
                onClick = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://t.me/sriexplainer"))
                    try { context.startActivity(intent) } catch (_: Exception) {}
                }
            )

            SettingsItem(
                icon = Icons.Default.Info,
                title = "App Version",
                subtitle = if (isCheckingUpdate) "Checking for updates..." else "1.2.1 (Tap to check update)",
                onClick = {
                    if (!isCheckingUpdate) {
                        isCheckingUpdate = true
                        coroutineScope.launch {
                            repository.checkAppUpdate().fold(
                                onSuccess = { update ->
                                    isCheckingUpdate = false
                                    if (update != null && update.versionCode > BuildConfig.VERSION_CODE) {
                                        manualUpdateInfo = update
                                    } else {
                                        Toast.makeText(context, "You're using the latest version (v1.2.1)!", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                onFailure = {
                                    isCheckingUpdate = false
                                    Toast.makeText(context, "Unable to check for updates", Toast.LENGTH_SHORT).show()
                                }
                            )
                        }
                    }
                }
            )

            // If logged in, show Log Out button in settings
            if (currentUser != null) {
                Spacer(modifier = Modifier.height(12.dp))
                SettingsItem(
                    icon = Icons.Default.Logout,
                    title = "Log Out",
                    subtitle = "Sign out from this device",
                    iconColor = Color(0xFFFF5252),
                    onClick = { showLogoutDialog = true }
                )
            }

            Spacer(modifier = Modifier.height(40.dp))
        }
    }

    // Login Bottom Sheet
    if (showLoginSheet) {
        LoginBottomSheet(
            onDismiss = { showLoginSheet = false },
            onLoginSuccess = { token, user ->
                sessionManager.saveSession(token, user)
                showLoginSheet = false
                Toast.makeText(context, "Welcome back, ${user.name ?: "VIP Member"}!", Toast.LENGTH_SHORT).show()
            },
            repository = repository
        )
    }

    // Logout Confirmation Dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = {
                Text(
                    text = "Sign Out?",
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to sign out of Sri Explainer?",
                    color = TextMuted
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        sessionManager.logout()
                        showLogoutDialog = false
                        Toast.makeText(context, "Signed out successfully", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE50914))
                ) {
                    Text("Log Out", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            containerColor = CardSurface,
            shape = RoundedCornerShape(16.dp)
        )
    }

    // Subscription & Cashfree / Paytm Bottom Sheet
    if (showSubscriptionSheet) {
        SubscriptionBottomSheet(
            onDismiss = { showSubscriptionSheet = false },
            userXpCoins = currentUser?.xpCoins ?: 0,
            isLoggedIn = currentUser != null,
            onLoginRequired = {
                showSubscriptionSheet = false
                showLoginSheet = true
            },
            onPlanSelected = { pkg ->
                activeCheckoutPlan = pkg
            }
        )
    }

    // 100% Direct In-App Cashfree & Paytm Checkout Dialog
    if (activeCheckoutPlan != null) {
        val plan = activeCheckoutPlan!!
        InAppPaymentDialog(
            planKey = plan.key,
            amount = plan.price,
            token = sessionManager.getToken(),
            onDismiss = { activeCheckoutPlan = null },
            onPaymentSuccess = {
                activeCheckoutPlan = null
                Toast.makeText(context, "🎉 Payment Successful! XP Coins added to your account.", Toast.LENGTH_LONG).show()
            }
        )
    }

    // Manual In-App Update Dialog
    manualUpdateInfo?.let { updateInfo ->
        AppUpdateDialog(
            updateInfo = updateInfo,
            onDismiss = { manualUpdateInfo = null }
        )
    }
}

@Composable
fun GuestProfileCard(
    onLoginClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(CardSurface)
            .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
            .padding(20.dp)
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_sri_logo),
                    contentDescription = "Sri Explainer Logo",
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .border(2.dp, BrandPurple, CircleShape)
                )

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Sri Explainer VIP",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Sign in to access VIP episodes",
                        fontSize = 12.sp,
                        color = BrandPurpleLight,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Sync watch history & enjoy unlimited streaming",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            Button(
                onClick = onLoginClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandPurple,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Login,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Sign In / Log In",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }
    }
}

@Composable
fun AuthenticatedUserCard(
    user: sriexplainer.app.data.model.User,
    onLogoutClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(CardSurface)
            .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
            .padding(20.dp)
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Avatar with user initials or logo
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(BrandPurple, BrandPurpleDark)
                            )
                        )
                        .border(2.dp, BrandPurpleLight, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    val initial = user.name?.firstOrNull()?.uppercaseChar()?.toString() ?: "U"
                    Text(
                        text = initial,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = user.name ?: "Sri Explainer Member",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = user.email ?: "",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(BrandPurple.copy(alpha = 0.2f))
                                .border(0.5.dp, BrandPurpleLight, RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = if (user.role == "admin") "ADMIN" else "VIP MEMBER",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = BrandPurpleLight
                            )
                        }
                        if ((user.xpCoins ?: 0) > 0) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "${user.xpCoins} XP",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = StarGold
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginBottomSheet(
    onDismiss: () -> Unit,
    onLoginSuccess: (String, sriexplainer.app.data.model.User) -> Unit,
    repository: SeriesRepository
) {
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current

    val googleSignInClient = remember {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken("166190554359-lgi7mit0dtto8fc74tsm5cl6le8pbrn8.apps.googleusercontent.com")
            .requestEmail()
            .requestProfile()
            .build()
        GoogleSignIn.getClient(context, gso)
    }

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            val accountEmail = account.email
            val name = account.displayName
            val avatar = account.photoUrl?.toString()
            val idToken = account.idToken
            if (!accountEmail.isNullOrBlank()) {
                isLoading = true
                errorMessage = null
                coroutineScope.launch {
                    val loginResult = repository.googleLogin(
                        email = accountEmail,
                        name = name,
                        avatar = avatar,
                        credential = idToken
                    )
                    isLoading = false
                    loginResult.fold(
                        onSuccess = { resp ->
                            if (resp.token != null && resp.user != null) {
                                onLoginSuccess(resp.token, resp.user)
                            } else {
                                errorMessage = resp.message ?: "Google login failed"
                            }
                        },
                        onFailure = { err ->
                            errorMessage = err.message ?: "Google authentication error"
                        }
                    )
                }
            }
        } catch (e: ApiException) {
            // statusCode 12501: User cancelled dialog
            if (e.statusCode != 12501) {
                errorMessage = "Google Sign-In failed (code ${e.statusCode})"
            }
        }
    }

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
                .padding(horizontal = 24.dp)
                .padding(bottom = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Text(
                text = "Welcome Back",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Sign in to your Sri Explainer VIP account",
                fontSize = 13.sp,
                color = TextMuted
            )

            // Error Banner
            if (errorMessage != null) {
                Spacer(modifier = Modifier.height(14.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF3B1520))
                        .border(1.dp, Color(0xFFFF5252).copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                        .padding(12.dp)
                ) {
                    Text(
                        text = errorMessage ?: "",
                        fontSize = 12.sp,
                        color = Color(0xFFFF8A80),
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Email Field
            OutlinedTextField(
                value = email,
                onValueChange = {
                    email = it
                    errorMessage = null
                },
                label = { Text("Email Address") },
                placeholder = { Text("you@example.com", color = TextDimmed) },
                leadingIcon = {
                    Icon(Icons.Default.Email, contentDescription = null, tint = TextMuted)
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                ),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) }
                ),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BrandPurple,
                    unfocusedBorderColor = BorderDark,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    cursorColor = BrandPurple
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Password Field
            OutlinedTextField(
                value = password,
                onValueChange = {
                    password = it
                    errorMessage = null
                },
                label = { Text("Password") },
                placeholder = { Text("••••••••", color = TextDimmed) },
                leadingIcon = {
                    Icon(Icons.Default.Lock, contentDescription = null, tint = TextMuted)
                },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = if (passwordVisible) "Hide password" else "Show password",
                            tint = TextMuted
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = { focusManager.clearFocus() }
                ),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BrandPurple,
                    unfocusedBorderColor = BorderDark,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    cursorColor = BrandPurple
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(22.dp))

            // Login Button
            Button(
                onClick = {
                    if (email.isBlank() || password.isBlank()) {
                        errorMessage = "Please enter both email and password"
                        return@Button
                    }
                    isLoading = true
                    errorMessage = null
                    coroutineScope.launch {
                        val result = repository.login(email, password)
                        isLoading = false
                        result.fold(
                            onSuccess = { response ->
                                if (response.token != null && response.user != null) {
                                    onLoginSuccess(response.token, response.user)
                                } else {
                                    errorMessage = response.message ?: "Authentication failed"
                                }
                            },
                            onFailure = { error ->
                                errorMessage = error.message ?: "Login failed. Please check credentials."
                            }
                        )
                    }
                },
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandPurple,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.5.dp
                    )
                } else {
                    Text(
                        text = "Sign In",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Native In-App Google Sign-In Button
            Button(
                onClick = {
                    errorMessage = null
                    // Sign out first to ensure account picker dialog always pops up
                    googleSignInClient.signOut().addOnCompleteListener {
                        googleSignInLauncher.launch(googleSignInClient.signInIntent)
                    }
                },
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF1E1830),
                    contentColor = Color.White
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, BrandPurpleLight.copy(alpha = 0.5f)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.AccountCircle,
                    contentDescription = null,
                    tint = BrandPurpleLight,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Sign in with Google",
                    fontSize = 14.sp,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Create Account Link
            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Don't have an account? ",
                    fontSize = 12.sp,
                    color = TextMuted
                )
                Text(
                    text = "Join Sri Explainer",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = BrandPurpleLight,
                    modifier = Modifier.clickable {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://sriexplainer.in/login"))
                        context.startActivity(intent)
                    }
                )
            }
        }
    }
}

@Composable
fun SettingsItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    iconColor: Color = BrandPurpleLight,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(CardSurface)
            .border(0.5.dp, BorderDark, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(CircleShape)
                .background(CardSurfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(20.dp)
            )
        }

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Text(
                text = subtitle,
                fontSize = 11.sp,
                color = TextMuted
            )
        }

        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = TextDimmed,
            modifier = Modifier.size(20.dp)
        )
    }
}
