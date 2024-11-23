sudo chown -R $USER:$USER ./.data/postgres
sudo chown -R $USER:$USER ./.data/rabbitmq
sudo chown -R $USER:$USER ./.data/redis
sudo chmod -R 755 ./.data/postgres
sudo chmod -R 755 ./.data/rabbitmq
sudo chmod -R 755 ./.data/redis

docker compose up -d --force-recreate --remove-orphans