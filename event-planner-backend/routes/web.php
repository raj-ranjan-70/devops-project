<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Fallback redirection for legacy email invitation links to gracefully route to the new secure React flow
Route::get('/public/rsvp/{guest}/{status}', function (\App\Models\Guest $guest, $status) {
    $action = ($status === 'confirmed') ? 'accept' : 'decline';
    $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
    return redirect($frontendUrl . '/rsvp/' . $guest->rsvp_token . '/' . $action);
});
