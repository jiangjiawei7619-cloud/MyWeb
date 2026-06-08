/** EXPLORE：无日月/IBL，仅保留极暗环境光，视觉照明由建筑/霓虹自发光 + Bloom 承担 */
export default function ExploreSceneLighting() {
  return <ambientLight intensity={0.03} color="#0a080c" />;
}
