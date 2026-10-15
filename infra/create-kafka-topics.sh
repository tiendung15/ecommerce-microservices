#!/bin/sh
# Tạo topic Kafka cho hệ thống (chạy 1 lần bởi container kafka-init trong docker-compose)
set -e
BOOTSTRAP="kafka:9092"
/opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BOOTSTRAP" --create --if-not-exists \
  --topic order-created --partitions 1 --replication-factor 1
echo "Topics:"
/opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BOOTSTRAP" --list
