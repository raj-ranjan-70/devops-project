# Jenkins Installation & Configuration Guide (Ubuntu EC2)

This guide walks you through installing Jenkins and configuring it for your **Wedding & Event Planning Dashboard** CI/CD pipeline.

---

## 🛠️ Step 1: Install Jenkins

Run these commands on your Ubuntu EC2 instance:

```bash
# Update system
sudo apt update

# Install Java (Required for Jenkins)
sudo apt install fontconfig openjdk-17-jre -y

# Add Jenkins repository and key
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install Jenkins
sudo apt-get update
sudo apt-get install jenkins -y

# Start and enable Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins
```

---

## 🔓 Step 2: Configure Permissions

Since Jenkins needs to run Docker commands, you must add the `jenkins` user to the `docker` group:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

---

## ⚙️ Step 3: Initial Jenkins Setup

1.  **Access Jenkins**: Open `http://your-ec2-ip:8080` in your browser.
2.  **Unlock Jenkins**: Get the admin password:
    ```bash
    sudo cat /var/lib/jenkins/secrets/initialAdminPassword
    ```
3.  **Install Plugins**: Choose "Install suggested plugins."
4.  **Create Admin User**: Follow the prompts to set up your account.

---

## 🔗 Step 4: Create the Pipeline

1.  Click **New Item** -> Name it `event-planner-pipeline` -> Select **Pipeline** -> OK.
2.  **Build Triggers**: Check **GitHub hook trigger for GITScm polling**.
3.  **Pipeline Section**:
    - **Definition**: Pipeline script from SCM
    - **SCM**: Git
    - **Repository URL**: `https://github.com/raj-ranjan-70/MVC-project.git`
    - **Branch Specifier**: `*/main`
    - **Script Path**: `Jenkinsfile`
4.  Click **Save**.

---

## 🚀 Step 5: Configure GitHub Webhook

1.  Go to your GitHub repository -> **Settings** -> **Webhooks** -> **Add webhook**.
2.  **Payload URL**: `http://your-ec2-ip:8080/github-webhook/`
3.  **Content type**: `application/json`
4.  **Events**: Just the `push` event.
5.  Click **Add webhook**.

---

## ✅ Step 6: Test the Pipeline
- Make a change to your code.
- Commit and push to the `main` branch.
- Watch Jenkins automatically start the build, deploy your Docker containers, and run migrations!
