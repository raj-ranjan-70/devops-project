<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\GuestController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MarketplaceController;
use App\Http\Controllers\Api\VendorPortalController;
use App\Http\Controllers\Api\MessageController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('events', EventController::class);
    Route::post('/guests/rsvp-bulk', [GuestController::class, 'rsvpBulk']);
    Route::apiResource('guests', GuestController::class);
    Route::post('/guests/{guest}/rsvp-email', [GuestController::class, 'rsvpEmail']);
    Route::apiResource('vendors', VendorController::class);
    Route::apiResource('budgets', BudgetController::class);
    
    // Marketplace routes
    Route::get('/marketplace', [MarketplaceController::class, 'index']);
    Route::post('/marketplace/book', [MarketplaceController::class, 'book']);
    Route::get('/marketplace/bookings', [MarketplaceController::class, 'myBookings']);

    // Vendor Portal routes
    Route::get('/vendor/services', [VendorPortalController::class, 'getServices']);
    Route::post('/vendor/services', [VendorPortalController::class, 'storeService']);
    Route::put('/vendor/services/{id}', [VendorPortalController::class, 'updateService']);
    Route::delete('/vendor/services/{id}', [VendorPortalController::class, 'destroyService']);
    Route::get('/vendor/bookings', [VendorPortalController::class, 'getBookings']);
    Route::post('/vendor/bookings/{id}/accept', [VendorPortalController::class, 'acceptBooking']);
    Route::post('/vendor/bookings/{id}/decline', [VendorPortalController::class, 'declineBooking']);
    
    // Admin routes
    Route::apiResource('admin/users', \App\Http\Controllers\Api\AdminUserController::class);
    Route::apiResource('admin/vendors', \App\Http\Controllers\Api\AdminVendorController::class);
    Route::apiResource('admin/events', \App\Http\Controllers\Api\AdminEventController::class);
    
    // Chat routes
    Route::get('/chat/contacts', [MessageController::class, 'getContacts']);
    Route::get('/chat/messages/{receiverId}', [MessageController::class, 'getMessages']);
    Route::post('/chat/messages', [MessageController::class, 'sendMessage']);

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
});
