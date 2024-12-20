build:
	- docker build -f docker/Dockerfile-develop -t ms-campaign-container:latest .
start:
	- docker run --name ms-campaign-container -d ms-campaign-container:latest
exec:
	- docker exec -it ms-campaign-container /bin/sh
logs:
	- docker logs -f --tail 50 --timestamps ms-campaign-container
test:
	- make build && make start
