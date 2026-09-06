package sriexplainer.app.data.network

import sriexplainer.app.data.model.Episode
import sriexplainer.app.data.model.Series
import sriexplainer.app.data.model.Slide
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface SriExplainerApi {

    @GET("api/slides")
    suspend fun getSlides(
        @Query("category") category: String? = null
    ): List<Slide>

    @GET("api/series")
    suspend fun getSeries(
        @Query("sort") sort: String? = "newest",
        @Query("genre") genre: String? = null,
        @Query("q") query: String? = null,
        @Query("status") status: String? = null,
        @Query("upcoming") upcoming: String? = null,
        @Query("limit") limit: Int? = null
    ): List<Series>

    @GET("api/episodes")
    suspend fun getEpisodes(
        @Query("seriesId") seriesId: String? = null
    ): List<Episode>

    @GET("api/episodes/{id}")
    suspend fun getEpisodeDetail(
        @Path("id") id: String
    ): Response<Episode>

    @GET("api/series/{id}")
    suspend fun getSeriesDetail(
        @Path("id") id: String
    ): Response<sriexplainer.app.data.model.SeriesDetailResponse>

    @POST("api/episodes/{id}/view")
    suspend fun recordView(
        @Path("id") id: String
    ): Response<Unit>

    @POST("api/auth/login")
    suspend fun login(
        @retrofit2.http.Body request: sriexplainer.app.data.model.LoginRequest
    ): Response<sriexplainer.app.data.model.LoginResponse>

    @POST("api/auth/google")
    suspend fun googleLogin(
        @retrofit2.http.Body request: sriexplainer.app.data.model.GoogleLoginRequest
    ): Response<sriexplainer.app.data.model.LoginResponse>

    @retrofit2.http.GET("api/auth/me")
    suspend fun getMe(
        @retrofit2.http.Header("Authorization") authHeader: String
    ): Response<sriexplainer.app.data.model.UserMeResponse>

    @POST("api/payments/cashfree/order")
    suspend fun createCashfreeOrder(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: sriexplainer.app.data.model.CreateOrderRequest
    ): Response<sriexplainer.app.data.model.CashfreeOrderResponse>

    @POST("api/cashfree/verify")
    suspend fun verifyCashfreePayment(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: sriexplainer.app.data.model.VerifyOrderRequest
    ): Response<sriexplainer.app.data.model.VerifyOrderResponse>

    @POST("api/history/progress")
    suspend fun syncProgress(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: sriexplainer.app.data.model.ProgressSyncRequest
    ): Response<sriexplainer.app.data.model.ProgressSyncResponse>

    @GET("api/episodes/{id}/comments")
    suspend fun getEpisodeComments(
        @Path("id") episodeId: String,
        @retrofit2.http.Header("Authorization") authHeader: String? = null
    ): List<sriexplainer.app.data.model.EpisodeComment>

    @POST("api/episodes/{id}/comments")
    suspend fun postEpisodeComment(
        @Path("id") episodeId: String,
        @retrofit2.http.Header("Authorization") authHeader: String? = null,
        @retrofit2.http.Body request: sriexplainer.app.data.model.PostCommentRequest
    ): Response<sriexplainer.app.data.model.EpisodeComment>

    @POST("api/comments/{id}/like")
    suspend fun likeComment(
        @Path("id") commentId: String,
        @retrofit2.http.Header("Authorization") authHeader: String
    ): Response<Map<String, Any>>

    @GET("api/announcements/active")
    suspend fun getActiveAnnouncement(): Response<sriexplainer.app.data.model.SiteAnnouncement?>

    @POST("api/favorites")
    suspend fun toggleFavorite(
        @retrofit2.http.Header("Authorization") authHeader: String,
        @retrofit2.http.Body request: Map<String, String>
    ): Response<Map<String, Any>>

    @GET("api/app-version")
    suspend fun getAppVersion(): Response<sriexplainer.app.data.model.AppUpdateInfo>
}

