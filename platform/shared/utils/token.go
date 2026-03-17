package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"ecommerce-platform/shared/middlewares"
)

type TokenUtils struct {
	Secret            string
	Expiry            time.Duration
	RefreshTokenExpiry time.Duration
}

func NewTokenUtils(secret string, expiry, refreshExpiry time.Duration) *TokenUtils {
	return &TokenUtils{
		Secret:            secret,
		Expiry:            expiry,
		RefreshTokenExpiry: refreshExpiry,
	}
}

func (t *TokenUtils) GenerateAccessToken(userID uuid.UUID, email string, roleID int) (string, error) {
	claims := &middlewares.Claims{
		UserID: userID,
		Email:  email,
		RoleID: roleID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(t.Expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(t.Secret))
}

func (t *TokenUtils) GenerateRefreshToken(userID uuid.UUID, email string, roleID int) (string, error) {
	claims := &middlewares.Claims{
		UserID: userID,
		Email:  email,
		RoleID: roleID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(t.RefreshTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(t.Secret))
}

func (t *TokenUtils) ValidateToken(tokenString string) (*middlewares.Claims, error) {
	claims := &middlewares.Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(t.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}

	return claims, nil
}
