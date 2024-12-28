start-services:
	- ./docker/scripts/init.sh
stop-services:
	- docker compose down
build:
	- docker build -f ./Dockerfile-prod -t ms-campaign-container:latest .
start:
	- docker run --name ms-campaign-container -p 5012:80 -d ms-campaign-container:latest
exec:
	- docker exec -it ms-campaign-container /bin/sh
logs:
	- docker logs -f --tail 50 --timestamps ms-campaign-container
