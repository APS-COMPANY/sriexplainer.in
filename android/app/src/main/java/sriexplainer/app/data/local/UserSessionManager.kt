package sriexplainer.app.data.local

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import sriexplainer.app.data.model.User

class UserSessionManager private constructor(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _currentUser = MutableStateFlow<User?>(loadUserFromPrefs())
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    val isLoggedIn: Boolean
        get() = !getToken().isNullOrBlank()

    fun saveSession(token: String, user: User) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_USER_ID, user.id)
            .putString(KEY_USER_NAME, user.name)
            .putString(KEY_USER_EMAIL, user.email)
            .putString(KEY_USER_AVATAR, user.avatar)
            .putString(KEY_USER_ROLE, user.role)
            .putInt(KEY_USER_XP, user.xpCoins ?: 0)
            .apply()

        _currentUser.value = user
    }

    fun logout() {
        prefs.edit().clear().apply()
        _currentUser.value = null
    }

    fun getToken(): String? {
        return prefs.getString(KEY_TOKEN, null)
    }

    fun getUser(): User? {
        return _currentUser.value
    }

    private fun loadUserFromPrefs(): User? {
        val token = prefs.getString(KEY_TOKEN, null)
        val id = prefs.getString(KEY_USER_ID, null)
        if (token.isNullOrBlank() || id.isNullOrBlank()) {
            return null
        }
        return User(
            id = id,
            name = prefs.getString(KEY_USER_NAME, null),
            email = prefs.getString(KEY_USER_EMAIL, null),
            avatar = prefs.getString(KEY_USER_AVATAR, null),
            role = prefs.getString(KEY_USER_ROLE, "user"),
            xpCoins = prefs.getInt(KEY_USER_XP, 0)
        )
    }

    companion object {
        private const val PREFS_NAME = "sri_user_session"
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_AVATAR = "user_avatar"
        private const val KEY_USER_ROLE = "user_role"
        private const val KEY_USER_XP = "user_xp"

        @Volatile
        private var instance: UserSessionManager? = null

        fun getInstance(context: Context): UserSessionManager {
            return instance ?: synchronized(this) {
                instance ?: UserSessionManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
