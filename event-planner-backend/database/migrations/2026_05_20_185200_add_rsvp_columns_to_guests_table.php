<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->string('rsvp_token', 40)->nullable()->unique()->index()->after('notes');
            $table->timestamp('rsvp_responded_at')->nullable()->after('rsvp_token');
            $table->text('rsvp_message')->nullable()->after('rsvp_responded_at');
        });

        // Securely backfill tokens for any pre-existing guests in the database
        $guests = DB::table('guests')->whereNull('rsvp_token')->get();
        foreach ($guests as $guest) {
            DB::table('guests')->where('id', $guest->id)->update([
                'rsvp_token' => bin2hex(random_bytes(20))
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->dropColumn(['rsvp_token', 'rsvp_responded_at', 'rsvp_message']);
        });
    }
};
