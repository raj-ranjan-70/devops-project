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

                    echo 'Waiting for database health...'

                    sh '''
                    until [ "$(docker inspect -f {{.State.Health.Status}} $(docker-compose ps -q db))" = "healthy" ];
                    do
                      echo "Waiting for database..."
                      sleep 5
                    done
                    '''

                    echo 'Running migrations...'

                    sh 'docker compose exec -T backend php artisan migrate --force'

                    echo 'Running seeders...'

                    sh 'docker compose exec -T backend php artisan db:seed --force'
                }
            }
        }
    }

    post {

        success {
            echo 'Deployment completed successfully!'
        }

        failure {
            echo 'Pipeline failed!'
        }
    }
}
