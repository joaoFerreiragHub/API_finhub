# FinHub — Auditoria de Encriptação
**Data:** 2026-03-26

## Estado da base de dados
Tipo: self-hosted
URI: localhost (sem credenciais)
Fonte: `.env.example` (`MONGODB_URI=mongodb://localhost:27017/finhub`)

## Campos sensíveis no User model

| Campo | Tipo actual | Risco RGPD | Recomendação |
|-------|-------------|------------|--------------|
| email | plaintext, unique index | Alto — PII identificável | Migrar para MongoDB Atlas (AES-256 free) |
| name, lastName | plaintext | Médio — PII moderada | Idem |
| password | bcrypt hash, select:false | Baixo — não recuperável | OK |
| passwordResetTokenHash | hash, select:false | Baixo | OK |
| emailVerificationTokenHash | hash, select:false | Baixo | OK |

## Recomendação

Se self-hosted: migrar para MongoDB Atlas M0 (free tier) — encryption at
rest AES-256 incluída. Sem alterações ao código aplicacional.
Se Atlas: nenhuma acção necessária.

## Estado
Pendente decisão de infra/deploy.
