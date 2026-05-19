<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use App\Models\VendorService;
use App\Models\ServiceBooking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MessageController extends Controller
{
    /**
     * Retrieve a list of chat contacts based on user roles and message history.
     */
    public function getContacts(Request $request)
    {
        $user = $request->user();
        $userId = $user->id;

        if ($user->role === 'admin') {
            // Admin can chat with all vendors and planners (active or suspended)
            $contacts = User::whereIn('role', ['vendor', 'planner'])->get();
        } else if ($user->role === 'planner') {
            // Planners can chat with only those vendors whose services they have booked
            $eventIds = \App\Models\Event::where('user_id', $userId)->pluck('id');
            $vendorServiceIds = ServiceBooking::whereIn('event_id', $eventIds)->pluck('vendor_service_id');
            $vendorUserIds = VendorService::whereIn('id', $vendorServiceIds)->pluck('user_id');

            $contacts = User::whereIn('id', $vendorUserIds)
                ->where('role', 'vendor')
                ->where('is_active', true)
                ->with('vendor')
                ->get();

            // Always add Admins to the Planner's contact list so they can chat with Admin
            $admins = User::where('role', 'admin')->get();
            $contacts = $admins->concat($contacts);
        } else {
            // Vendors can chat with planners who have booked them or with whom they have a chat history
            $serviceIds = VendorService::where('user_id', $userId)->pluck('id');
            
            $plannerIds = ServiceBooking::whereIn('vendor_service_id', $serviceIds)
                ->with('event')
                ->get()
                ->pluck('event.user_id')
                ->unique()
                ->filter();

            $chatSenderIds = Message::where('receiver_id', $userId)->pluck('sender_id');
            $chatReceiverIds = Message::where('sender_id', $userId)->pluck('receiver_id');
            
            $allPlannerIds = $plannerIds->merge($chatSenderIds)->merge($chatReceiverIds)->unique()->filter();

            $contacts = User::whereIn('id', $allPlannerIds)
                ->where('role', 'planner')
                ->get();

            // If no active bookings or past chats exist, fallback to all planners to keep it usable
            if ($contacts->isEmpty()) {
                $contacts = User::where('role', 'planner')->get();
            }

            // Always add Admins to the Vendor's contact list so they can chat with Admin
            $admins = User::where('role', 'admin')->get();
            $contacts = $admins->concat($contacts);
        }

        // Include unread message counts for each contact
        $contacts = $contacts->map(function ($contact) use ($userId) {
            $contact->unread_count = Message::where('sender_id', $contact->id)
                ->where('receiver_id', $userId)
                ->where('is_read', false)
                ->count();
            return $contact;
        });

        return response()->json($contacts);
    }

    /**
     * Fetch all messages between the authenticated user and a specific recipient.
     */
    public function getMessages(Request $request, $receiverId)
    {
        $authUserId = $request->user()->id;

        // Fetch all messages in the conversation thread
        $messages = Message::where(function ($q) use ($authUserId, $receiverId) {
                $q->where('sender_id', $authUserId)->where('receiver_id', $receiverId);
            })
            ->orWhere(function ($q) use ($authUserId, $receiverId) {
                $q->where('sender_id', $receiverId)->where('receiver_id', $authUserId);
            })
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark incoming messages in this thread as read
        Message::where('sender_id', $receiverId)
            ->where('receiver_id', $authUserId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json($messages);
    }

    /**
     * Send a message to a recipient and trigger a notification.
     */
    public function sendMessage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'receiver_id' => 'required|exists:users,id',
            'message' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $sender = $request->user();
        if ($sender->role === 'planner' && !$sender->is_active) {
            $receiver = User::findOrFail($request->receiver_id);
            if ($receiver->role !== 'admin') {
                return response()->json(['message' => 'Your account is currently suspended. You can only chat with the administrator.'], 403);
            }
        }
        
        // Save the chat message
        $message = Message::create([
            'sender_id' => $sender->id,
            'receiver_id' => $request->receiver_id,
            'message' => $request->message,
            'is_read' => false,
        ]);

        // Insert a corresponding notification in the database for the receiver
        Notification::create([
            'user_id' => $request->receiver_id,
            'title' => 'New message from ' . $sender->name,
            'message' => mb_strimwidth($request->message, 0, 50, '...'),
            'type' => 'message',
            'is_read' => false,
        ]);

        return response()->json($message, 201);
    }
}
