<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\VendorService;
use App\Models\ServiceBooking;
use App\Models\Event;
use Illuminate\Support\Facades\Validator;

class MarketplaceController extends Controller
{
    public function index(Request $request)
    {
        $query = VendorService::with('user')
            ->where('is_available', true)
            ->whereHas('user', function($q) {
                $q->where('is_active', true);
            });

        if ($request->has('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        if ($request->has('max_price') && $request->max_price) {
            $query->where('starting_price', '<=', $request->max_price);
        }

        if ($request->has('location') && $request->location) {
            $query->where('location', 'like', '%' . $request->location . '%');
        }

        return response()->json($query->get());
    }

    public function book(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'planner' && !$user->is_active) {
            return response()->json(['message' => 'Your account is currently suspended. You cannot book services.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'event_id' => 'required|exists:events,id',
            'vendor_service_id' => 'required|exists:vendor_services,id',
            'message' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // Ensure the event belongs to the user
        $event = Event::findOrFail($request->event_id);
        if ($event->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($event->status === 'completed') {
            return response()->json(['message' => 'Cannot book services for a completed event.'], 422);
        }

        $booking = ServiceBooking::create([
            'event_id' => $request->event_id,
            'vendor_service_id' => $request->vendor_service_id,
            'message' => $request->message,
            'status' => 'pending'
        ]);

        return response()->json($booking, 201);
    }

    public function myBookings(Request $request)
    {
        $userId = $request->user()->id;
        $bookings = ServiceBooking::whereHas('event', function($query) use ($userId) {
            $query->where('user_id', $userId);
        })->with(['event', 'vendorService.user', 'payments'])->get();

        return response()->json($bookings);
    }
}
