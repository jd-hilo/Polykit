"use client";
import { useAuth } from "@/components/auth/AuthProvider";

const AVATAR_IMGS = [
  "/social_proof_candid/01_ferrari_night_lean.jpg",
  "/social_proof_candid/04_hoodie_sports_car_garage.jpg",
  "/social_proof_candid/14_private_jet_champagne.jpg",
  "/social_proof_candid/09_lambo_yellow_london.jpg",
  "/social_proof_candid/10_mercedes_lv_bags.jpg",
];

export function TrustCTA({ label = "Start winning today" }: { label?: string }) {
  const { openAuth } = useAuth();
  return (
    <div className="flex flex-col items-center gap-5 py-8">
      <button onClick={openAuth} className="btn-primary btn-primary-lg group">
        {label} <span className="transition group-hover:translate-x-1">→</span>
      </button>
      <div className="flex flex-col items-center gap-2">
        <div className="flex -space-x-2">
          {AVATAR_IMGS.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" style={{ zIndex: AVATAR_IMGS.length - i }} />
          ))}
        </div>
        <div className="text-sm text-muted-foreground">Trusted by 21k+ Traders</div>
      </div>
    </div>
  );
}
