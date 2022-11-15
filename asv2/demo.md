> **Note**
> This page is a work in progress 🙌

# Social Connect Demo

A demo of Celo Identity v2.

## What is SocialConnect?

SocialConnect is a service used to map phone numbers to wallet addresses to enable easy crypto interactions with just a phone.
SocialConnect allows anyone to become an "issuer" and provide verification for phone number mapping as opposed to v1 which relied on validators to complete the verification.

## Prerequisites

- Node >v14 -> use NVM to easily install and switch versions
- Git
- Yarn

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

For phone number verification to work with twillio, follow part of [this](https://www.twilio.com/blog/phone-verification-react-native) tutorial to setup the twilio verify backend.
Add the issuer private key `NEXT_PUBLIC_ISSUER_PRIVATE_KEY` and the twilio URL `NEXT_PUBLIC_TWILIO_URL` to the .env file

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Contribute

Technical improvements are always welcome via an issue or a PR. These improvements can be anything from clarity of this README to code improvements.
For in depth projects or research built on identity use cases, please see the [Bounties](https://celocommunity.xyz/bounty-board) related to identity on the Community Bounty Board.

## Contact

[Discord](https://discord.com/invite/6yWMkgM)
[Celo University Guild](https://celocommunity.xyz/celo-university-guild-test)
