const CARDS = [
  { caption: "@manifold_moose", gain: "+$3,482,910", img: "/social_proof_candid/14_private_jet_champagne.jpg" },
  { caption: "@yesorno_vic", gain: "+$128,411", img: "/social_proof_candid/01_ferrari_night_lean.jpg" },
  { caption: "@oddsbreaker7", gain: "+$14,000", img: "/social_proof_candid/09_lambo_yellow_london.jpg" },
  { caption: "@contrarian_pete", gain: "+$9,127", img: "/social_proof_candid/15_private_jet_laptop.jpg" },
  { caption: "@liquidityghost", gain: "+$6,810", img: "/social_proof_candid/04_hoodie_sports_car_garage.jpg" },
  { caption: "@sixsigma_sam", gain: "+$22,450", img: "/social_proof_candid/10_mercedes_lv_bags.jpg" },
];

export function SocialProofGallery() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <h2 className="text-3xl font-extrabold md:text-5xl">Everyone&apos;s Winning. Why Aren&apos;t You?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Traders are cashing out daily while you&apos;re still on the sidelines.</p>
      </div>
      <div className="mt-10 overflow-x-auto scrollbar-hide">
        <div className="mx-auto flex gap-4 px-4" style={{ width: "max-content" }}>
          {CARDS.map((c, i) => (
            <div
              key={i}
              className="relative h-64 w-48 shrink-0 overflow-hidden rounded-2xl shadow-lg"
            >
              {/* Photo background */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.img}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Dark gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.78) 100%)",
                }}
              />
              {/* Content */}
              <div className="relative flex h-full flex-col justify-between p-4 text-white">
                <div className="text-xs opacity-70">▶ Play</div>
                <div>
                  <div className="text-2xl font-extrabold drop-shadow">{c.gain}</div>
                  <div className="mt-1 text-xs font-medium leading-tight opacity-90">{c.caption}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
