FROM golang:1.21 AS builder

WORKDIR /app

ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=off

COPY . .

RUN go mod tidy && go mod download

RUN CGO_ENABLED=0 GOOS=linux go build -o /order-service ./cmd

FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY --from=builder /order-service .

EXPOSE 8084

CMD ["./order-service"]
