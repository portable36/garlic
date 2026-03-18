FROM golang:1.21 AS builder

WORKDIR /app

ENV GOPROXY=https://goproxy.cn,https://goproxy.io,direct
ENV GOSUMDB=off
ENV GIT_TERMINAL_PROMPT=0
ENV GODEBUG=http2client=0

RUN git config --global --add url."https://".insteadOf git:// && \
    git config --global --add url."https://github.com/".insteadOf "git@github.com:" && \
    git config --global --add url."https://".insteadOf "git://"

COPY . .

RUN go mod tidy && go mod download

RUN CGO_ENABLED=0 GOOS=linux go build -o /product-service ./cmd

FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY --from=builder /product-service .

EXPOSE 8082

CMD ["./product-service"]
