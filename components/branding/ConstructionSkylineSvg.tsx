export default function ConstructionSkylineSvg({ className = "" }: { className?: string }) {
  return <svg className={`construction-skyline-svg ${className}`} viewBox="0 0 720 150" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 139h704M35 139V91h24v48m12 0V66h31v73m12 0V102h28v37m16 0V42h40v97m15 0V80h25v59m14 0V58h46v81m16 0V94h32v45m15 0V28h36v111m16 0V74h32v65m12 0V53h50v86m15 0V86h24v53m13 0V38h34v101" />
      <path d="M25 91h44M75 66h43M151 42h40M226 80h41M295 58h48M372 94h32M419 28h39M505 74h32M549 53h52M625 86h38M675 38h34" />
      <path d="M455 18v112m-34-102h68m-52 8h38m-58 0 34-18 34 18m-34-18V4m0 14 44 16m-44-16-42 36" />
      <path d="M474 50l-19 22m-22-44 36 22" />
      <path d="M90 139V29m-15 18h30m-23-8 8-10 8 10m-8-10v-9" />
    </g>
  </svg>;
}
