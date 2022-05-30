pipeline {
  agent {
    docker {
      image 'centos:my-centos'
      args '-u 0:0 --privileged'
    }
  }

  stages {
    stage("Gather Vault Token and Vault Address") {
      steps {
        script {
          env.VAULT_TOKEN = input(message: 'Insert Vault Token', id: 'VAULT_TOKEN', parameters: [string(name: 'Token')])
          env.VAULT_ENDPOINT = input(message: 'Insert the Vault Endpoint', id: 'VAULT_ENDPOINT', parameters: [string(name: 'Address')])
          env.VAULT_SKIP_VERIFY = "true"
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'make install-dependencies'
      }
    }

    stage('Run test') {
      steps {
        sh 'make test/all'
      }
    }
  }
  post {
    always {
      sh 'rm -rf test/ terraform/'
    }
  }
}