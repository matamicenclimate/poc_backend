# Variables
# ------------------------------------------------------------------------------
PROJECT_NAME=climatecoin
VERSION=`node -p -e "require('./package.json').version"`
IMAGE_ID=registry.dekaside.com/${PROJECT_NAME}/${PROJECT_NAME}-backend

# Build and push docker image.
# ------------------------------------------------------------------------------
build:
	docker build . -f ./compose/production/node/Dockerfile --tag ${IMAGE_ID}:latest --tag ${IMAGE_ID}:${VERSION}
push: build
	docker push ${IMAGE_ID}:${VERSION}
	docker push ${IMAGE_ID}:latest