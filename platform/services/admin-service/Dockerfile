FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

ENV GOPROXY=https://goproxy.cn,https://goproxy.io,direct
ENV GOSUMDB=sum.golang.org
ENV GIT_TERMINAL_PROMPT=0
ENV GODEBUG=http2client=0
ENV GOTOOLCHAIN=auto

RUN git config --global --add url."https://".insteadOf git://

COPY go.mod ./

RUN go mod download

COPY . .

RUN go mod tidy

RUN CGO_ENABLED=0 GOOS=linux go build -o /admin-service ./cmd/main.go

FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /admin-service .

EXPOSE 8090

CMD ["./admin-service"]
