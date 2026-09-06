package sriexplainer.app.data.repository

import sriexplainer.app.data.model.Episode
import sriexplainer.app.data.model.Series
import sriexplainer.app.data.model.Slide
import sriexplainer.app.data.network.NetworkModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SeriesRepository {
    private val api = NetworkModule.api

    suspend fun getSlides(): Result<List<Slide>> = withContext(Dispatchers.IO) {
        try {
            val slides = api.getSlides()
            Result.success(slides)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getLatestSeries(limit: Int = 20): Result<List<Series>> = withContext(Dispatchers.IO) {
        try {
            val series = api.getSeries(sort = "newest", limit = limit)
            Result.success(series)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getPopularSeries(limit: Int = 20): Result<List<Series>> = withContext(Dispatchers.IO) {
        try {
            val series = api.getSeries(sort = "popular", limit = limit)
            Result.success(series)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUpcomingSeries(limit: Int = 20): Result<List<Series>> = withContext(Dispatchers.IO) {
        try {
            val series = api.getSeries(status = "upcoming", limit = limit)
            Result.success(series)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSeriesByGenre(genre: String, limit: Int = 20): Result<List<Series>> = withContext(Dispatchers.IO) {
        try {
            val series = api.getSeries(genre = genre, limit = limit)
            Result.success(series)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun searchSeries(query: String, genre: String? = null): Result<List<Series>> = withContext(Dispatchers.IO) {
        try {
            val series = api.getSeries(query = query, genre = genre, limit = 50)
            Result.success(series)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSeriesDetail(id: String): Result<sriexplainer.app.data.model.SeriesDetailResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.getSeriesDetail(id = id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Series not found (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getEpisodes(seriesId: String? = null): Result<List<Episode>> = withContext(Dispatchers.IO) {
        try {
            val episodes = api.getEpisodes(seriesId = seriesId)
            Result.success(episodes)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getLatestEpisodes(): Result<List<Episode>> = withContext(Dispatchers.IO) {
        try {
            val episodes = api.getEpisodes(seriesId = null)
            Result.success(episodes)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getEpisodeDetail(id: String): Result<Episode> = withContext(Dispatchers.IO) {
        try {
            val response = api.getEpisodeDetail(id = id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Episode not found or restricted (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun recordView(id: String) = withContext(Dispatchers.IO) {
        try {
            api.recordView(id)
        } catch (_: Exception) {}
    }

    suspend fun login(email: String, password: String): Result<sriexplainer.app.data.model.LoginResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.login(sriexplainer.app.data.model.LoginRequest(email.trim(), password))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                val message = if (!errorBody.isNullOrBlank() && errorBody.contains("message")) {
                    try {
                        val obj = com.google.gson.JsonParser.parseString(errorBody).asJsonObject
                        obj.get("message")?.asString ?: "Login failed (${response.code()})"
                    } catch (_: Exception) {
                        "Login failed (${response.code()})"
                    }
                } else {
                    "Invalid email or password (${response.code()})"
                }
                Result.failure(Exception(message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun googleLogin(
        email: String,
        name: String? = null,
        avatar: String? = null,
        credential: String? = null
    ): Result<sriexplainer.app.data.model.LoginResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.googleLogin(sriexplainer.app.data.model.GoogleLoginRequest(email.trim(), name, avatar, credential))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Google login failed (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMe(token: String): Result<sriexplainer.app.data.model.User> = withContext(Dispatchers.IO) {
        try {
            val authHeader = if (token.startsWith("Bearer ", ignoreCase = true)) token else "Bearer $token"
            val response = api.getMe(authHeader)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.toUser())
            } else {
                Result.failure(Exception("Failed to fetch user profile (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createCashfreeOrder(token: String, plan: String, amount: Int): Result<sriexplainer.app.data.model.CashfreeOrderResponse> = withContext(Dispatchers.IO) {
        try {
            val authHeader = if (token.startsWith("Bearer ", ignoreCase = true)) token else "Bearer $token"
            val response = api.createCashfreeOrder(authHeader, sriexplainer.app.data.model.CreateOrderRequest(plan, amount))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val err = response.errorBody()?.string() ?: "Order creation failed (${response.code()})"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyPayment(token: String, orderId: String): Result<sriexplainer.app.data.model.VerifyOrderResponse> = withContext(Dispatchers.IO) {
        try {
            val authHeader = if (token.startsWith("Bearer ", ignoreCase = true)) token else "Bearer $token"
            val response = api.verifyCashfreePayment(authHeader, sriexplainer.app.data.model.VerifyOrderRequest(orderId))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Payment verification failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun syncProgress(
        token: String,
        episodeId: String,
        currentPosition: Long,
        duration: Long,
        progress: Int
    ): Result<sriexplainer.app.data.model.ProgressSyncResponse> = withContext(Dispatchers.IO) {
        try {
            val authHeader = if (token.startsWith("Bearer ", ignoreCase = true)) token else "Bearer $token"
            val response = api.syncProgress(
                authHeader,
                sriexplainer.app.data.model.ProgressSyncRequest(
                    episodeId = episodeId,
                    currentPosition = currentPosition,
                    duration = duration,
                    progress = progress
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to sync progress"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getEpisodeComments(
        episodeId: String,
        token: String? = null
    ): Result<List<sriexplainer.app.data.model.EpisodeComment>> = withContext(Dispatchers.IO) {
        try {
            val authHeader = if (!token.isNullOrBlank()) {
                if (token.startsWith("Bearer ", ignoreCase = true)) token else "Bearer $token"
            } else null
            val comments = api.getEpisodeComments(episodeId, authHeader)
            Result.success(comments)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun postComment(
        episodeId: String,
        content: String,
        token: String? = null,
        guestName: String? = null,
        parentId: String? = null
    ): Result<sriexplainer.app.data.model.EpisodeComment> = withContext(Dispatchers.IO) {
        try {
            val authHeader = if (!token.isNullOrBlank()) {
                if (token.startsWith("Bearer ", ignoreCase = true)) token else "Bearer $token"
            } else null
            val response = api.postEpisodeComment(
                episodeId,
                authHeader,
                sriexplainer.app.data.model.PostCommentRequest(
                    content = content,
                    guestName = guestName,
                    parentId = parentId
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to post comment (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun likeComment(
        commentId: String,
        token: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val authHeader = if (token.startsWith("Bearer ", ignoreCase = true)) token else "Bearer $token"
            val response = api.likeComment(commentId, authHeader)
            if (response.isSuccessful) {
                val liked = (response.body()?.get("liked") as? Boolean) ?: true
                Result.success(liked)
            } else {
                Result.failure(Exception("Failed to like comment"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getActiveAnnouncement(): Result<sriexplainer.app.data.model.SiteAnnouncement?> = withContext(Dispatchers.IO) {
        try {
            val response = api.getActiveAnnouncement()
            if (response.isSuccessful) {
                Result.success(response.body())
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.success(null)
        }
    }

    suspend fun toggleFavorite(
        seriesId: String,
        token: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val authHeader = if (token.startsWith("Bearer ", ignoreCase = true)) token else "Bearer $token"
            val response = api.toggleFavorite(authHeader, mapOf("seriesId" to seriesId))
            if (response.isSuccessful) {
                val favorited = (response.body()?.get("favorited") as? Boolean) ?: true
                Result.success(favorited)
            } else {
                Result.failure(Exception("Failed to update favorite"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun checkAppUpdate(): Result<sriexplainer.app.data.model.AppUpdateInfo?> = withContext(Dispatchers.IO) {
        try {
            val response = api.getAppVersion()
            if (response.isSuccessful) {
                Result.success(response.body())
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.success(null)
        }
    }
}

