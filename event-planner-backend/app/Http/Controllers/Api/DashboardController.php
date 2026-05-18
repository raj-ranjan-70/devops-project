<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Guest;
use App\Models\Vendor;
use App\Models\User;
use App\Models\Payment;
use App\Models\VendorService;
use App\Models\ServiceBooking;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $userId = $user->id;

        if ($user->role === 'admin') {
            return response()->json([
                'stats' => [
                    'total_users' => User::where('role', '!=', 'admin')->count(),
                    'active_planners' => User::where('role', 'planner')->where('is_active', true)->count(),
                    'verified_vendors' => User::where('role', 'vendor')->where('is_active', true)->count(),
                    'pending_approvals' => User::where('role', 'vendor')->where('is_active', false)->count(),
                    'platform_revenue' => Payment::where('status', 'completed')->sum('amount') ?? 0,
                ],
                'recent_users' => User::where('role', '!=', 'admin')->orderBy('created_at', 'desc')->limit(5)->get(),
                'pending_vendors' => User::where('role', 'vendor')->where('is_active', false)->orderBy('created_at', 'desc')->limit(5)->get(),
            ]);
        }

        if ($user->role === 'vendor') {
            $serviceIds = VendorService::where('user_id', $userId)->pluck('id');

            $activeBookingsCount = ServiceBooking::whereIn('vendor_service_id', $serviceIds)
                ->where('status', 'accepted')
                ->count();

            $pendingRequestsCount = ServiceBooking::whereIn('vendor_service_id', $serviceIds)
                ->where('status', 'pending')
                ->count();

            $totalEarnings = ServiceBooking::whereIn('vendor_service_id', $serviceIds)
                ->whereIn('status', ['accepted', 'completed'])
                ->with('vendorService')
                ->get()
                ->sum(function($booking) {
                    return $booking->vendorService->starting_price ?? 0;
                });

            $avgRating = VendorService::where('user_id', $userId)->avg('rating') ?? 5.0;

            $recentBookings = ServiceBooking::whereIn('vendor_service_id', $serviceIds)
                ->with(['event', 'vendorService'])
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'stats' => [
                    'active_bookings' => $activeBookingsCount,
                    'pending_requests' => $pendingRequestsCount,
                    'total_earnings' => $totalEarnings,
                    'average_rating' => round($avgRating, 1),
                ],
                'recent_bookings' => $recentBookings,
                'services' => VendorService::where('user_id', $userId)->get(),
            ]);
        }

        // Default planner logic
        $totalEvents = Event::where('user_id', $userId)->count();
        $upcomingEvents = Event::where('user_id', $userId)->where('status', 'upcoming')->count();
        
        $totalGuests = Guest::whereHas('event', function($query) use ($userId) {
            $query->where('user_id', $userId);
        })->count();

        $totalVendors = Vendor::whereHas('event', function($query) use ($userId) {
            $query->where('user_id', $userId);
        })->count();

        $recentEvents = Event::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'stats' => [
                'total_events' => $totalEvents,
                'upcoming_events' => $upcomingEvents,
                'total_guests' => $totalGuests,
                'total_vendors' => $totalVendors,
            ],
            'recent_events' => $recentEvents
        ]);
    }
}
