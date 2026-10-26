# Google Play Data Safety Worksheet

Complete this worksheet against the final production build and legal policy before submitting the Play form.

## Collection and sharing

| Data category | Collected | Purpose | Ephemeral | User deletion |
| --- | --- | --- | --- | --- |
| Email address | Yes | Account management and authentication | No | Yes |
| User IDs/profile | Yes | App functionality and account management | No | Yes |
| Photos | Yes | User-selected private sharing | No | Yes |
| Other user-generated content | Yes | Captions, comments, status, reactions, nudges, reports | No | Yes |
| App interactions | Yes | Connections, invite flow, notification delivery | No | Yes |
| Device or other IDs | Yes | Push token registration and delivery | No | Yes |
| Crash/diagnostic data | Verify release build | Essential operations only; no analytics SDK currently installed | N/A | Verify |
| Precise/approximate location | No | Not requested | N/A | N/A |
| Contacts | No | Not requested | N/A | N/A |
| Audio | No | Camera audio recording is disabled | N/A | N/A |
| Payment/financial data | No | Not collected | N/A | N/A |

Supabase and Expo are service providers processing data to deliver core app functionality. Confirm Play Console treatment of provider processing when completing the form. The app does not sell data and contains no advertising or behavioral analytics SDK.

## Security declarations

- Data is encrypted in transit.
- Users can request deletion in-app.
- Publish a working web deletion URL before submission.
- Private photos use authenticated downloads and storage policies that check the current user's access.
- Reports and blocks support the user-generated-content safety policy.

## Submission checks

- Compare this worksheet to the final dependency graph and Android manifest.
- Verify camera and photo-library permission disclosures in the store listing.
- Verify the final Privacy Policy URL is public, stable, and matches this build.
- Verify the account deletion URL works without requiring the app to be installed.
