FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

ENV GOPROXY=direct
ENV GOSUMDB=off

COPY go.mod ./

RUN go mod download -x

COPY . .

RUN go mod tidy

RUN CGO_ENABLED=0 GOOS=linux go build -o /admin-service ./cmd/main.go

FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /admin-service .

EXPOSE 8090

CMD ["./admin-service"]
