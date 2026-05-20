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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_booking_id')->constrained()->onDelete('cascade');
            $table->string('razorpay_order_id')->nullable();
            $table->string('razorpay_payment_id')->nullable()->unique();
            $table->string('currency')->default('INR');
            $table->decimal('amount', 10, 2);
            $table->enum('status', ['pending', 'paid', 'failed'])->default('pending');
            $table->timestamp('payment_date')->nullable();
            $table->text('gateway_response')->nullable();
            $table->timestamps();
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
