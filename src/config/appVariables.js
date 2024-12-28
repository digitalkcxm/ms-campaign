global._variables = {}
export default class AppVariables {
  static loadConfig() {
    global._variables = process.env
  }

  static port() { return global._variables['PORT'] }
  static stateEnv() { return global._variables['STATE_ENV'] }
  static projectName() { return global._variables['PROJECT_NAME'] }
  static logLevel() { return global._variables['LOG_LEVEL'] }
  static DBHost() { return global._variables['DB_HOST'] }
  static DBBase() { return global._variables['DB_DATABASE'] }
  static DBUserName() { return global._variables['DB_USERNAME'] }
  static DBPassword() { return global._variables['DB_PASSWORD'] }
  static RabbitMQUser() { return global._variables['RABBITMQ_USER'] }
  static RabbitMQPassword() { return global._variables['RABBITMQ_PASSWORD'] }
  static RabbitMQHost() { return global._variables['RABBITMQ_HOST'] }
  static RabbitMQPort() { return global._variables['RABBITMQ_PORT'] }
  static MSCompany() { return global._variables['MSCOMPANY'] }
  static RedisHost() { return global._variables['REDIS_HOST'] }
  static RedisPort() { return global._variables['REDIS_PORT'] }
  static ProjectName() { return global._variables['PROJECT_NAME'] }
  static MSCRMManager() { return global._variables['MSCRMMANAGER'] }
  static MSWorkflow() { return global._variables['MSWORKFLOW'] }
  static CoreEMail() { return global._variables['COREEMAIL'] }
  static CorePass() { return global._variables['COREPASS'] }
  static accessKeyId() {return global._variables['ACCESSKEYID']}
  static secretAccessKey() {return global._variables['SECRETACCESSKEY']}
  static bucketCampaing() {return global._variables['BUCKET_CAMPAIGN']}
}
