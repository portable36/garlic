FROM golang:1.21 AS builder

WORKDIR /app

ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=off

COPY . .

RUN go mod tidy && go mod download

RUN CGO_ENABLED=0 GOOS=linux go build -o /cart-service ./cmd

FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY --from=builder /cart-service .

EXPOSE 8083

CMD ["./cart-service"]
