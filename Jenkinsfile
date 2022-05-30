pipeline {
  agent {
    docker {
      image 'centos:my-centos'
      args '-u 0:0 --privileged'
    }
  }
  stages {
    stage('Install Dependencies') {
      steps {
        sh 'make install-dependencies'
      }
    }

    stage('Run test') {
      steps {
        script {
          env.VAULT_TOKEN = input(message: 'Insert Vault Token', id: 'VAULT_TOKEN', parameters: [string(name: 'Token')])
        }
        sh 'make test/all'
      }
    }

  }
  post {
    always {
      sh 'rm -rf terraform/.terraform'
    }
  }
}