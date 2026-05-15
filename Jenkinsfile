pipeline {
    agent any

    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Deploy') {
            steps {
                script {
                    echo 'Building and starting containers...'
                    sh 'docker compose down'
                    sh 'docker compose up --build -d'
                }
            }
        }

        stage('Post-Deployment Tasks') {
            steps {
                script {
                    echo 'Running migrations and seeders...'
                    // Wait for DB to be healthy
                    sh 'sleep 30' 
                    sh 'docker exec event-planner-api php artisan migrate --force'
                    sh 'docker exec event-planner-api php artisan db:seed --class=CategorySeeder'
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the logs.'
        }
    }
}
