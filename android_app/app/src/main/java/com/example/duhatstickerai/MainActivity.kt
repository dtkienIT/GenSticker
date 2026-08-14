package com.example.duhatstickerai

import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.TimeUnit

// -----------------------------------------------------------------------------
// Domain Data Models
// -----------------------------------------------------------------------------

data class ExpressionConfig(
    val id: String,
    val nameEn: String,
    val nameVi: String,
    val emoji: String,
    val color: String
)

val EXPRESSIONS = listOf(
    ExpressionConfig("happy", "Happy", "Vui vẻ", "😊", "#FFD700"),
    ExpressionConfig("laughing", "LOL", "Cười to", "😂", "#FF8C00"),
    ExpressionConfig("love", "Love", "Yêu thích", "😍", "#FF69B4"),
    ExpressionConfig("sad", "Sad", "Buồn bã", "😢", "#6495ED"),
    ExpressionConfig("angry", "Angry", "Tức giận", "😡", "#E74C3C"),
    ExpressionConfig("surprised", "Shocked", "Bất ngờ", "😲", "#9B59B6"),
    ExpressionConfig("thumbsup", "Thumbs Up", "Đồng ý", "👍", "#2ECC71"),
    ExpressionConfig("sleepy", "Sleepy", "Buồn ngủ", "😴", "#B39DDB")
)

data class GeneratedSticker(
    val expressionId: String,
    var imageBase64: String? = null,
    var isSuccess: Boolean = false,
    var isLoading: Boolean = true,
    var error: String? = null
)

data class SavedStickerPack(
    val id: String,
    val title: String,
    val createdAt: Long,
    val stickerPaths: List<String>
)

enum class AppScreen {
    LANDING, UPLOAD, GENERATING, PREVIEW, TRAY
}

enum class Language {
    EN, VI
}

// -----------------------------------------------------------------------------
// Main Activity
// -----------------------------------------------------------------------------

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DUHATStickerAIApp()
        }
    }
}

// -----------------------------------------------------------------------------
// Main App Root & Navigation
// -----------------------------------------------------------------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DUHATStickerAIApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var currentScreen by remember { mutableStateOf(AppScreen.LANDING) }
    var language by remember { mutableStateOf(Language.VI) }

    // Upload & Generation state
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var selectedImageBase64 by remember { mutableStateOf<String?>(null) }
    var isValidating by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }

    // Generating state
    var stickersMap by remember {
        mutableStateOf(EXPRESSIONS.associate { expr -> expr.id to GeneratedSticker(expr.id) })
    }
    var isDoneGenerating by remember { mutableStateOf(false) }

    // Saved packs
    var savedPacks by remember { mutableStateOf(loadSavedPacks(context)) }

    val okHttpClient = remember {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    // Backend URL (10.0.2.2 points to host machine from Android Emulator)
    val serverUrl = "http://10.0.2.2:8000"

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = androidx.compose.ui.graphics.Color(0xFF8A2BE2),
            secondary = androidx.compose.ui.graphics.Color(0xFFFF69B4),
            background = androidx.compose.ui.graphics.Color(0xFF121216),
            surface = androidx.compose.ui.graphics.Color(0xFF1E1E24),
            onPrimary = androidx.compose.ui.graphics.Color.White,
            onSurface = androidx.compose.ui.graphics.Color.White
        )
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🎨 DUHAT AI Sticker", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                    },
                    actions = {
                        // Language toggle button
                        Button(
                            onClick = {
                                language = if (language == Language.VI) Language.EN else Language.VI
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = androidx.compose.ui.graphics.Color(0xFF2C2C36)
                            ),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text(
                                if (language == Language.VI) "🇻🇳 VI" else "🇬🇧 EN",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = androidx.compose.ui.graphics.Color(0xFF18181F)
                    )
                )
            },
            bottomBar = {
                NavigationBar(containerColor = androidx.compose.ui.graphics.Color(0xFF18181F)) {
                    NavigationBarItem(
                        selected = currentScreen == AppScreen.LANDING || currentScreen == AppScreen.UPLOAD || currentScreen == AppScreen.GENERATING || currentScreen == AppScreen.PREVIEW,
                        onClick = { currentScreen = AppScreen.LANDING },
                        icon = { Icon(Icons.Default.AutoAwesome, contentDescription = "Create") },
                        label = { Text(if (language == Language.VI) "Tạo Sticker" else "Create") }
                    )
                    NavigationBarItem(
                        selected = currentScreen == AppScreen.TRAY,
                        onClick = {
                            savedPacks = loadSavedPacks(context)
                            currentScreen = AppScreen.TRAY
                        },
                        icon = { Icon(Icons.Default.Collections, contentDescription = "Library") },
                        label = { Text(if (language == Language.VI) "Bộ đã lưu" else "Saved Packs") }
                    )
                }
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(androidx.compose.ui.graphics.Color(0xFF121216))
            ) {
                when (currentScreen) {
                    AppScreen.LANDING -> LandingScreen(
                        language = language,
                        onStartCreate = { currentScreen = AppScreen.UPLOAD },
                        onViewSaved = {
                            savedPacks = loadSavedPacks(context)
                            currentScreen = AppScreen.TRAY
                        }
                    )

                    AppScreen.UPLOAD -> UploadScreen(
                        language = language,
                        selectedUri = selectedImageUri,
                        isValidating = isValidating,
                        validationError = validationError,
                        onImageSelected = { uri ->
                            selectedImageUri = uri
                            validationError = null
                            scope.launch(Dispatchers.IO) {
                                selectedImageBase64 = uriToBase64(context, uri)
                            }
                        },
                        onValidateAndProceed = {
                            val b64 = selectedImageBase64
                            if (b64 == null) {
                                validationError = if (language == Language.VI) "Vui lòng chọn 1 ảnh selfie" else "Please select a selfie photo"
                                return@UploadScreen
                            }
                            isValidating = true
                            validationError = null

                            scope.launch {
                                val result = validateImageApi(okHttpClient, serverUrl, b64)
                                isValidating = false
                                if (result.first) {
                                    // Start SSE sticker generation
                                    stickersMap = EXPRESSIONS.associate { expr -> expr.id to GeneratedSticker(expr.id) }
                                    isDoneGenerating = false
                                    currentScreen = AppScreen.GENERATING

                                    startSseGeneration(
                                        client = okHttpClient,
                                        baseUrl = serverUrl,
                                        imageBase64 = b64,
                                        onStickerReceived = { sticker ->
                                            stickersMap = stickersMap.toMutableMap().apply {
                                                put(sticker.expressionId, sticker)
                                            }
                                        },
                                        onComplete = {
                                            isDoneGenerating = true
                                        }
                                    )
                                } else {
                                    validationError = result.second ?: (if (language == Language.VI) "Ảnh không hợp lệ. Vui lòng chọn ảnh có 1 khuôn mặt rõ ràng." else "Invalid image. Please pick a clear selfie.")
                                }
                            }
                        }
                    )

                    AppScreen.GENERATING -> GeneratingScreen(
                        language = language,
                        stickers = stickersMap.values.toList(),
                        isDone = isDoneGenerating,
                        onProceedToPreview = {
                            currentScreen = AppScreen.PREVIEW
                        }
                    )

                    AppScreen.PREVIEW -> PreviewScreen(
                        language = language,
                        stickers = stickersMap.values.toList(),
                        onSavePack = { title ->
                            scope.launch(Dispatchers.IO) {
                                val success = saveStickerPack(context, title, stickersMap.values.filter { it.isSuccess })
                                withContext(Dispatchers.Main) {
                                    if (success) {
                                        Toast.makeText(
                                            context,
                                            if (language == Language.VI) "Đã lưu bộ sticker thành công!" else "Sticker pack saved!",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                        savedPacks = loadSavedPacks(context)
                                        currentScreen = AppScreen.TRAY
                                    } else {
                                        Toast.makeText(
                                            context,
                                            if (language == Language.VI) "Lỗi khi lưu bộ sticker" else "Failed to save pack",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                }
                            }
                        }
                    )

                    AppScreen.TRAY -> TrayScreen(
                        language = language,
                        savedPacks = savedPacks,
                        onDeletePack = { packId ->
                            deleteStickerPack(context, packId)
                            savedPacks = loadSavedPacks(context)
                        },
                        onCreateNew = {
                            currentScreen = AppScreen.UPLOAD
                        }
                    )
                }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Screen 1: Landing Screen
// -----------------------------------------------------------------------------

@Composable
fun LandingScreen(
    language: Language,
    onStartCreate: () -> Unit,
    onViewSaved: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(androidx.compose.ui.graphics.Color(0xFF8A2BE2).copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Text("✨", fontSize = 54.sp)
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = if (language == Language.VI) "DUHAT AI Sticker Studio" else "DUHAT AI Sticker Studio",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = androidx.compose.ui.graphics.Color.White,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (language == Language.VI)
                "Biến 1 bức ảnh selfie của bạn thành bộ 8 sticker Chibi Kawaii độc đáo với trí tuệ nhân tạo Gemini AI!"
            else
                "Transform a single selfie photo into 8 cute Chibi Kawaii AI stickers using Gemini AI!",
            fontSize = 15.sp,
            color = androidx.compose.ui.graphics.Color.Gray,
            textAlign = TextAlign.Center,
            lineHeight = 22.sp
        )

        Spacer(modifier = Modifier.height(36.dp))

        // Features list
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            FeatureRow(
                emoji = "👤",
                title = if (language == Language.VI) "Tự động nhận diện & cắt nền" else "Selfie to Chibi Cutout",
                desc = if (language == Language.VI) "AI tách nền viền sticker sắc nét" else "Clean AI background removal"
            )
            FeatureRow(
                emoji = "🎭",
                title = if (language == Language.VI) "8 Bộc lộ cảm xúc vui nhộn" else "8 Expressive Variants",
                desc = if (language == Language.VI) "Vui, Cười, Yêu, Buồn, Giận, Thumbs up, Buồn ngủ..." else "Happy, LOL, Love, Sad, Angry, Thumbs up..."
            )
            FeatureRow(
                emoji = "⚡",
                title = if (language == Language.VI) "Tạo nhanh song song SSE" else "Parallel Real-time Generation",
                desc = if (language == Language.VI) "Xem sticker hiển thị trực tiếp ngay khi xong" else "Real-time streaming generation"
            )
        }

        Spacer(modifier = Modifier.height(40.dp))

        Button(
            onClick = onStartCreate,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = androidx.compose.ui.graphics.Color(0xFF8A2BE2)
            )
        ) {
            Icon(Icons.Default.AddPhotoAlternate, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                if (language == Language.VI) "Tạo Bộ Sticker Ngay" else "Create Sticker Pack Now",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedButton(
            onClick = onViewSaved,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, androidx.compose.ui.graphics.Color(0xFF8A2BE2))
        ) {
            Icon(Icons.Default.FolderSpecial, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                if (language == Language.VI) "Xem Bộ Sticker Đã Lưu" else "View Saved Packs",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun FeatureRow(emoji: String, title: String, desc: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(androidx.compose.ui.graphics.Color(0xFF1E1E24))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(emoji, fontSize = 28.sp)
        Spacer(modifier = Modifier.width(14.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = androidx.compose.ui.graphics.Color.White)
            Text(desc, fontSize = 12.sp, color = androidx.compose.ui.graphics.Color.Gray)
        }
    }
}

// -----------------------------------------------------------------------------
// Screen 2: Upload Screen
// -----------------------------------------------------------------------------

@Composable
fun UploadScreen(
    language: Language,
    selectedUri: Uri?,
    isValidating: Boolean,
    validationError: String?,
    onImageSelected: (Uri) -> Unit,
    onValidateAndProceed: () -> Unit
) {
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { onImageSelected(it) }
    }

    var consentChecked by remember { mutableStateOf(true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = if (language == Language.VI) "Tải lên ảnh Selfie" else "Upload Selfie Photo",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = androidx.compose.ui.graphics.Color.White
        )

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = if (language == Language.VI) "Chọn 1 bức ảnh rõ mặt để Gemini AI tạo sticker chính xác nhất" else "Pick a clear front-facing selfie for best AI sticker generation",
            fontSize = 13.sp,
            color = androidx.compose.ui.graphics.Color.Gray,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Image Drop Zone Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
                .clickable { launcher.launch("image/*") },
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color(0xFF1E1E24))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .border(2.dp, androidx.compose.ui.graphics.Color(0xFF8A2BE2).copy(alpha = 0.5f), RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (selectedUri != null) {
                    val context = LocalContext.current
                    val bitmap = remember(selectedUri) {
                        try {
                            val stream = context.contentResolver.openInputStream(selectedUri)
                            BitmapFactory.decodeStream(stream)
                        } catch (e: Exception) {
                            null
                        }
                    }
                    if (bitmap != null) {
                        Image(
                            bitmap = bitmap.asImageBitmap(),
                            contentDescription = "Selfie preview",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CloudUpload,
                            contentDescription = null,
                            modifier = Modifier.size(56.dp),
                            tint = androidx.compose.ui.graphics.Color(0xFF8A2BE2)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            if (language == Language.VI) "Bấm để chọn ảnh từ bộ sưu tập" else "Tap to choose photo",
                            fontWeight = FontWeight.Bold,
                            color = androidx.compose.ui.graphics.Color.White
                        )
                        Text(
                            if (language == Language.VI) "Định dạng JPEG, PNG, WebP (Tối đa 10MB)" else "JPEG, PNG, WebP (Max 10MB)",
                            fontSize = 12.sp,
                            color = androidx.compose.ui.graphics.Color.Gray
                        )
                    }
                }
            }
        }

        if (validationError != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Surface(
                color = androidx.compose.ui.graphics.Color(0xFF3E1E1E),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = androidx.compose.ui.graphics.Color.Red)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(validationError, fontSize = 13.sp, color = androidx.compose.ui.graphics.Color.White)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Consent Checkbox
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Checkbox(
                checked = consentChecked,
                onCheckedChange = { consentChecked = it },
                colors = CheckboxDefaults.colors(checkedColor = androidx.compose.ui.graphics.Color(0xFF8A2BE2))
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = if (language == Language.VI)
                    "Tôi đồng ý sử dụng khuôn mặt trong ảnh để tạo sticker AI cá nhân hóa"
                else
                    "I consent to processing my selfie for personalized AI sticker generation",
                fontSize = 12.sp,
                color = androidx.compose.ui.graphics.Color.LightGray
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onValidateAndProceed,
            enabled = selectedUri != null && consentChecked && !isValidating,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = androidx.compose.ui.graphics.Color(0xFF8A2BE2))
        ) {
            if (isValidating) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = androidx.compose.ui.graphics.Color.White)
                Spacer(modifier = Modifier.width(12.dp))
                Text(if (language == Language.VI) "Đang kiểm tra AI..." else "Validating with Gemini AI...")
            } else {
                Text(
                    if (language == Language.VI) "Kiểm Tra & Tạo Sticker 🚀" else "Validate & Generate 🚀",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Screen 3: Generating Screen (Live SSE Grid)
// -----------------------------------------------------------------------------

@Composable
fun GeneratingScreen(
    language: Language,
    stickers: List<GeneratedSticker>,
    isDone: Boolean,
    onProceedToPreview: () -> Unit
) {
    val completedCount = stickers.count { !it.isLoading }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = if (language == Language.VI) "Đang Tạo Bộ Sticker Chibi" else "Generating Chibi Sticker Pack",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = androidx.compose.ui.graphics.Color.White
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = if (language == Language.VI)
                "Tiến độ: $completedCount / ${EXPRESSIONS.size} sticker (Song song SSE)"
            else
                "Progress: $completedCount / ${EXPRESSIONS.size} stickers (Parallel SSE)",
            fontSize = 13.sp,
            color = androidx.compose.ui.graphics.Color.Gray
        )

        Spacer(modifier = Modifier.height(12.dp))

        LinearProgressIndicator(
            progress = { completedCount.toFloat() / EXPRESSIONS.size.toFloat() },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = androidx.compose.ui.graphics.Color(0xFF8A2BE2),
            trackColor = androidx.compose.ui.graphics.Color(0xFF2C2C36)
        )

        Spacer(modifier = Modifier.height(16.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(EXPRESSIONS) { exprConfig ->
                val sticker = stickers.find { it.expressionId == exprConfig.id }
                StickerGridCard(
                    exprConfig = exprConfig,
                    sticker = sticker,
                    language = language
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onProceedToPreview,
            enabled = isDone || completedCount > 0,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = androidx.compose.ui.graphics.Color(0xFF8A2BE2))
        ) {
            Text(
                text = if (isDone) {
                    if (language == Language.VI) "Xem & Chỉnh Sửa Bộ Sticker ✨" else "Preview & Save Pack ✨"
                } else {
                    if (language == Language.VI) "Xem Trước (Đang tạo... $completedCount/${EXPRESSIONS.size})" else "Preview ($completedCount/${EXPRESSIONS.size} done)"
                },
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun StickerGridCard(
    exprConfig: ExpressionConfig,
    sticker: GeneratedSticker?,
    language: Language
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color(0xFF1E1E24))
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            if (sticker == null || sticker.isLoading) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(32.dp),
                        color = androidx.compose.ui.graphics.Color(0xFF8A2BE2)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "${exprConfig.emoji} ${if (language == Language.VI) exprConfig.nameVi else exprConfig.nameEn}",
                        fontSize = 12.sp,
                        color = androidx.compose.ui.graphics.Color.Gray
                    )
                }
            } else if (sticker.isSuccess && sticker.imageBase64 != null) {
                val bitmap = remember(sticker.imageBase64) {
                    val bytes = Base64.decode(sticker.imageBase64, Base64.DEFAULT)
                    val rawBitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    // Render pill text overlay natively
                    val textLabel = if (language == Language.VI) exprConfig.nameVi else exprConfig.nameEn
                    renderPillTextOverlay(rawBitmap, textLabel, exprConfig.color)
                }

                if (bitmap != null) {
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = exprConfig.nameEn,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit
                    )
                }
            } else {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(8.dp)
                ) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = androidx.compose.ui.graphics.Color.Red)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "${exprConfig.emoji} Lỗi tạo",
                        fontSize = 12.sp,
                        color = androidx.compose.ui.graphics.Color.Red
                    )
                }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Screen 4: Preview Screen & Saver
// -----------------------------------------------------------------------------

@Composable
fun PreviewScreen(
    language: Language,
    stickers: List<GeneratedSticker>,
    onSavePack: (String) -> Unit
) {
    var packTitle by remember {
        mutableStateOf(if (language == Language.VI) "Bộ Sticker Chibi Của Tôi" else "My Chibi Sticker Pack")
    }

    val successStickers = stickers.filter { it.isSuccess && it.imageBase64 != null }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = if (language == Language.VI) "Xem Trước Bộ Sticker" else "Sticker Pack Preview",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = androidx.compose.ui.graphics.Color.White
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = if (language == Language.VI) "Tổng số ${successStickers.size} sticker thành công" else "Total ${successStickers.size} stickers generated",
            fontSize = 13.sp,
            color = androidx.compose.ui.graphics.Color.Gray
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = packTitle,
            onValueChange = { packTitle = it },
            label = { Text(if (language == Language.VI) "Tên Bộ Sticker" else "Pack Title") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = androidx.compose.ui.graphics.Color(0xFF8A2BE2),
                unfocusedBorderColor = androidx.compose.ui.graphics.Color(0xFF2C2C36)
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(EXPRESSIONS) { exprConfig ->
                val sticker = stickers.find { it.expressionId == exprConfig.id }
                StickerGridCard(
                    exprConfig = exprConfig,
                    sticker = sticker,
                    language = language
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = { onSavePack(packTitle) },
            enabled = successStickers.isNotEmpty(),
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = androidx.compose.ui.graphics.Color(0xFF8A2BE2))
        ) {
            Icon(Icons.Default.Save, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                if (language == Language.VI) "Lưu Bộ Sticker Vào Máy 💾" else "Save Pack to Library 💾",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// -----------------------------------------------------------------------------
// Screen 5: Tray / Saved Packs Screen
// -----------------------------------------------------------------------------

@Composable
fun TrayScreen(
    language: Language,
    savedPacks: List<SavedStickerPack>,
    onDeletePack: (String) -> Unit,
    onCreateNew: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (language == Language.VI) "Bộ Sticker Đã Lưu" else "Saved Sticker Packs",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = androidx.compose.ui.graphics.Color.White
            )

            IconButton(onClick = onCreateNew) {
                Icon(Icons.Default.AddCircle, contentDescription = "Create New", tint = androidx.compose.ui.graphics.Color(0xFF8A2BE2))
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (savedPacks.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("📦", fontSize = 64.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        if (language == Language.VI) "Chưa có bộ sticker nào được lưu" else "No saved sticker packs yet",
                        color = androidx.compose.ui.graphics.Color.Gray,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = onCreateNew,
                        colors = ButtonDefaults.buttonColors(containerColor = androidx.compose.ui.graphics.Color(0xFF8A2BE2))
                    ) {
                        Text(if (language == Language.VI) "+ Tạo ngay bộ sticker đầu tiên" else "+ Create First Pack")
                    }
                }
            }
        } else {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                savedPacks.forEach { pack ->
                    SavedPackCard(
                        pack = pack,
                        language = language,
                        onDelete = { onDeletePack(pack.id) }
                    )
                }
            }
        }
    }
}

@Composable
fun SavedPackCard(
    pack: SavedStickerPack,
    language: Language,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color(0xFF1E1E24))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(pack.title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = androidx.compose.ui.graphics.Color.White)
                    Text(
                        "${pack.stickerPaths.size} stickers",
                        fontSize = 12.sp,
                        color = androidx.compose.ui.graphics.Color.Gray
                    )
                }

                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = androidx.compose.ui.graphics.Color.Red.copy(alpha = 0.8f))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Sticker thumbnail previews
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                pack.stickerPaths.take(4).forEach { path ->
                    val bitmap = remember(path) {
                        BitmapFactory.decodeFile(path)
                    }
                    if (bitmap != null) {
                        Image(
                            bitmap = bitmap.asImageBitmap(),
                            contentDescription = null,
                            modifier = Modifier
                                .size(64.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(androidx.compose.ui.graphics.Color(0xFF2C2C36)),
                            contentScale = ContentScale.Fit
                        )
                    }
                }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Native Canvas Pill Text Overlay Compositor
// -----------------------------------------------------------------------------

fun renderPillTextOverlay(originalBitmap: Bitmap, text: String, hexColor: String): Bitmap {
    val resultBitmap = originalBitmap.copy(Bitmap.Config.ARGB_8888, true)
    val canvas = Canvas(resultBitmap)
    val width = resultBitmap.width.toFloat()
    val height = resultBitmap.height.toFloat()

    val paint = Paint().apply {
        isAntiAlias = true
        textSize = height * 0.075f
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }

    val textWidth = paint.measureText(text)
    val fontMetrics = paint.fontMetrics
    val textHeight = fontMetrics.bottom - fontMetrics.top

    val paddingX = width * 0.05f
    val paddingY = height * 0.02f

    val pillWidth = textWidth + (paddingX * 2)
    val pillHeight = textHeight + (paddingY * 2)

    val pillLeft = (width - pillWidth) / 2f
    val pillTop = height - pillHeight - (height * 0.05f)
    val pillRight = pillLeft + pillWidth
    val pillBottom = pillTop + pillHeight

    // Draw Pill Background
    val bgPaint = Paint().apply {
        isAntiAlias = true
        color = Color.parseColor(hexColor)
        style = Paint.Style.FILL
    }
    val rectF = RectF(pillLeft, pillTop, pillRight, pillBottom)
    canvas.drawRoundRect(rectF, pillHeight / 2f, pillHeight / 2f, bgPaint)

    // Draw White Text
    paint.color = Color.WHITE
    val textX = (width - textWidth) / 2f
    val textY = pillTop + paddingY - fontMetrics.top
    canvas.drawText(text, textX, textY, paint)

    return resultBitmap
}

// -----------------------------------------------------------------------------
// Storage & Persistence Helper Functions
// -----------------------------------------------------------------------------

fun saveStickerPack(context: Context, title: String, stickers: List<GeneratedSticker>): Boolean {
    return try {
        val packId = UUID.randomUUID().toString()
        val stickersDir = File(context.filesDir, "stickers/$packId")
        if (!stickersDir.exists()) stickersDir.mkdirs()

        val savedPaths = mutableListOf<String>()
        stickers.forEachIndexed { index, sticker ->
            if (sticker.imageBase64 != null) {
                val file = File(stickersDir, "sticker_${sticker.expressionId}.png")
                val bytes = Base64.decode(sticker.imageBase64, Base64.DEFAULT)
                FileOutputStream(file).use { out ->
                    out.write(bytes)
                }
                savedPaths.add(file.absolutePath)
            }
        }

        val prefs = context.getSharedPreferences("duhat_stickers", Context.MODE_PRIVATE)
        val existingPacks = loadSavedPacks(context).toMutableList()
        val newPack = SavedStickerPack(
            id = packId,
            title = title,
            createdAt = System.currentTimeMillis(),
            stickerPaths = savedPaths
        )
        existingPacks.add(0, newPack)

        val gson = Gson()
        prefs.edit().putString("packs_json", gson.toJson(existingPacks)).apply()
        true
    } catch (e: Exception) {
        Log.e("DUHATStickerAI", "Error saving sticker pack", e)
        false
    }
}

fun loadSavedPacks(context: Context): List<SavedStickerPack> {
    return try {
        val prefs = context.getSharedPreferences("duhat_stickers", Context.MODE_PRIVATE)
        val json = prefs.getString("packs_json", null) ?: return emptyList()
        val type = object : TypeToken<List<SavedStickerPack>>() {}.type
        Gson().fromJson(json, type) ?: emptyList()
    } catch (e: Exception) {
        emptyList()
    }
}

fun deleteStickerPack(context: Context, packId: String) {
    try {
        val packs = loadSavedPacks(context).filter { it.id != packId }
        val prefs = context.getSharedPreferences("duhat_stickers", Context.MODE_PRIVATE)
        prefs.edit().putString("packs_json", Gson().toJson(packs)).apply()

        val stickersDir = File(context.filesDir, "stickers/$packId")
        if (stickersDir.exists()) {
            stickersDir.deleteRecursively()
        }
    } catch (e: Exception) {
        Log.e("DUHATStickerAI", "Error deleting pack", e)
    }
}

fun uriToBase64(context: Context, uri: Uri): String? {
    return try {
        val inputStream = context.contentResolver.openInputStream(uri) ?: return null
        val bitmap = BitmapFactory.decodeStream(inputStream)
        val baos = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, baos)
        Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
    } catch (e: Exception) {
        null
    }
}

// -----------------------------------------------------------------------------
// Network API & SSE Streaming Functions
// -----------------------------------------------------------------------------

suspend fun validateImageApi(client: OkHttpClient, baseUrl: String, imageBase64: String): Pair<Boolean, String?> {
    return withContext(Dispatchers.IO) {
        try {
            val json = Gson().toJson(
                mapOf(
                    "image_base64" to imageBase64,
                    "mime_type" to "image/jpeg"
                )
            )
            val requestBody = json.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$baseUrl/api/validate")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()
            val respStr = response.body?.string()
            if (response.isSuccessful && respStr != null) {
                val map = Gson().fromJson(respStr, Map::class.java)
                val valid = map["valid"] as? Boolean ?: false
                val errorMsg = map["error_message"] as? String
                Pair(valid, errorMsg)
            } else {
                Pair(false, "API call failed with code ${response.code}")
            }
        } catch (e: Exception) {
            Pair(false, "Connection error: ${e.message}")
        }
    }
}

fun startSseGeneration(
    client: OkHttpClient,
    baseUrl: String,
    imageBase64: String,
    onStickerReceived: (GeneratedSticker) -> Unit,
    onComplete: () -> Unit
) {
    val json = Gson().toJson(
        mapOf(
            "image_base64" to imageBase64,
            "mime_type" to "image/jpeg"
        )
    )
    val requestBody = json.toRequestBody("application/json".toMediaType())
    val request = Request.Builder()
        .url("$baseUrl/api/generate-pack")
        .post(requestBody)
        .build()

    val listener = object : EventSourceListener() {
        override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
            try {
                if (data.contains("\"done\": true")) {
                    onComplete()
                    return
                }

                val map = Gson().fromJson(data, Map::class.java)
                val exprId = map["expression_id"] as? String ?: return
                val imgB64 = map["image_base64"] as? String
                val success = map["success"] as? Boolean ?: false
                val error = map["error"] as? String

                val sticker = GeneratedSticker(
                    expressionId = exprId,
                    imageBase64 = imgB64,
                    isSuccess = success,
                    isLoading = false,
                    error = error
                )
                onStickerReceived(sticker)
            } catch (e: Exception) {
                Log.e("DUHATStickerAI", "Error parsing SSE event", e)
            }
        }

        override fun onFailure(eventSource: EventSource, t: Throwable?, response: Response?) {
            Log.e("DUHATStickerAI", "SSE Failure", t)
            onComplete()
        }

        override fun onClosed(eventSource: EventSource) {
            onComplete()
        }
    }

    EventSources.createFactory(client).newEventSource(request, listener)
}
