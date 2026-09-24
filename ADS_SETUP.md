# Tossup ad placements

Three reserved, non-sticky placements sit below the spinner: desktop leaderboard (up to 970 × 90), mobile banner (320 × 100), and lower-page rectangle (300 × 250). The leaderboard and mobile banner swap at 640px; the rectangle is shown below the content on mobile. Space is reserved to avoid layout shift. Ad units initialize only near the viewport; unconfigured units remain clearly labeled empty slots.

## Google AdSense

Configure these public build-time environment variables in the hosting dashboard:

- `VITE_AD_PROVIDER=adsense`
- `VITE_ADSENSE_CLIENT_ID=ca-pub-...`
- `VITE_ADSENSE_LEADERBOARD_SLOT` — leaderboard unit ID
- `VITE_ADSENSE_MOBILE_SLOT` — mobile unit ID
- `VITE_ADSENSE_RECTANGLE_SLOT` — rectangle unit ID

The app loads the AdSense script once and initializes each visible unit separately. Add the publisher's required ads.txt entry and any regionally required consent management before enabling ads.

## Monetag

Configure `VITE_AD_PROVIDER=monetag` and `VITE_MONETAG_LEADERBOARD_ZONE`, `VITE_MONETAG_MOBILE_ZONE`, and `VITE_MONETAG_RECTANGLE_ZONE` with the corresponding publisher zone IDs. Integrate the approved display/banner or native widget tags supplied in the Monetag dashboard: the app fires a `tossup:monetag-slot` browser event as each placement nears view. Its `detail` includes `placement`, `zoneId`, and the reserved DOM `element` for mounting that zone. No third-party publisher script is loaded without explicit integration. Avoid popunders, interstitials, and sticky overlays, which would interrupt the spinner.

Publisher IDs are public identifiers, not secret keys. Ads are not live until approved provider details are configured. Update consent and privacy disclosures as required in your jurisdiction.
