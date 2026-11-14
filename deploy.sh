docker buildx build --platform linux/arm64 --load -t verekia/manapack .
docker save verekia/manapack | gzip > /tmp/manapack.tar.gz
scp /tmp/manapack.tar.gz midgar:/tmp/
ssh midgar docker load --input /tmp/manapack.tar.gz
ssh midgar docker compose up -d manapack
