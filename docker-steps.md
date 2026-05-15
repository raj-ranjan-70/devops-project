# Docker Deployment Guide (AWS EC2 - Ubuntu)

Follow these steps to deploy the **Wedding & Event Planning Dashboard** on an AWS EC2 instance running Ubuntu.

---

## 🛠️ Step 1: Prepare the EC2 Instance
1.  **Launch Instance**: Select **Ubuntu Server 22.04 LTS**.
2.  **Security Group**: Ensure the following ports are open:
    - `22` (SSH)
    - `80` (HTTP - Frontend)
    - `8000` (Backend API)
    - `3306` (Optional: MySQL)

---

## 📦 Step 2: Install Docker & Docker Compose
Run the following commands on your EC2 terminal:

```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to the docker group (to run without sudo)
sudo usermod -aG docker $USER
# (Note: Logout and login back for group changes to take effect)

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

## 🚀 Step 3: Clone and Deploy
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/raj-ranjan-70/MVC-project.git
    cd MVC-project
    ```

2.  **Configure Environment**:
    - Ensure your `.env` files are present in `event-planner-backend/` and `event-planner-frontend/`.
    - In `event-planner-frontend/.env`, set `VITE_API_URL` to your EC2 public IP (e.g., `http://your-ec2-ip:8000/api`).

3.  **Build and Run**:
    ```bash
    docker-compose up --build -d
    ```

4.  **Database Migration**:
    Wait for the DB to initialize, then run migrations inside the container:
    ```bash
    docker exec -it event-planner-api php artisan migrate --force
    docker exec -it event-planner-api php artisan db:seed --class=CategorySeeder
    ```

---

## ✅ Step 4: Verify Deployment
- Access the Frontend: `http://your-ec2-ip`
- Access the API: `http://your-ec2-ip:8000/api`

---

## 🛑 Useful Commands
- **Stop Containers**: `docker-compose down`
- **View Logs**: `docker-compose logs -f`
- **Restart Backend**: `docker-compose restart backend`
