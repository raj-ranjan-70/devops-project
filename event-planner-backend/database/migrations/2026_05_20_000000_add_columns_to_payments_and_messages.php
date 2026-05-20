<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Extend payments table
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('vendor_id')->nullable()->after('service_booking_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('planner_id')->nullable()->after('vendor_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('event_id')->nullable()->after('planner_id')->constrained('events')->onDelete('cascade');
            $table->text('message')->nullable()->after('amount');
            $table->string('payment_source')->default('chat')->after('status');
        });

        // Extend messages table
        Schema::table('messages', function (Blueprint $table) {
            $table->string('type')->default('text')->after('message');
            $table->foreignId('payment_id')->nullable()->after('type')->constrained('payments')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove columns from messages table
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['payment_id']);
            $table->dropColumn(['type', 'payment_id']);
        });

        // Remove columns from payments table
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
            $table->dropForeign(['planner_id']);
            $table->dropForeign(['event_id']);
            $table->dropColumn(['vendor_id', 'planner_id', 'event_id', 'message', 'payment_source']);
        });
    }
};
