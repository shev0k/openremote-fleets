import { Vehicle } from "../../../../domain/models/vehicle";
import { getCoordinateDistanceMeters } from "../../../../domain/utils/geo";
import { MOCK_FLEET_FIXTURES } from "./fleetFixtures";

interface PlaybackRouteFixture {
  vehicleId: string;
  points: {
    latitude: number;
    longitude: number;
    timestampIso: string;
  }[];
  tripSegments: {
    id: string;
    startLabel: string;
    endLabel: string;
    durationLabel: string;
    distanceLabel: string;
    stopCount: number;
    maxSpeedLabel: string;
    averageSpeedLabel: string;
    startProgressPercent: number;
    endProgressPercent: number;
  }[];
}

interface RoadSegmentFixtureInput {
  id: string;
  geometry: string;
  startIso: string;
  durationMinutes: number;
  stopCount: number;
}

interface RoadRouteFixtureOptions {
  dedupeCoordinates?: boolean;
  connectSegments?: boolean;
}

function decodePolyline6(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([latitude / 1_000_000, longitude / 1_000_000]);
  }

  return coordinates;
}

function getTrafficTimeWeight(progressRatio: number): number {
  const cruiseVariation = 0.8 + 0.25 * Math.sin(progressRatio * Math.PI * 2);
  const stopAndGoPulse =
    Math.exp(-Math.pow((progressRatio - 0.28) / 0.08, 2)) * 2.8 +
    Math.exp(-Math.pow((progressRatio - 0.68) / 0.1, 2)) * 1.9;

  return Math.max(0.55, cruiseVariation + stopAndGoPulse);
}

function createTimestampedPoints(
  geometry: string,
  startIso: string,
  durationMinutes: number,
): PlaybackRouteFixture["points"] {
  const coordinates = decodePolyline6(geometry);
  const startTime = new Date(startIso).valueOf();
  const segmentWeights = coordinates.slice(1).map((coordinate, coordinateIndex) => {
    const distanceMeters = getCoordinateDistanceMeters(coordinates[coordinateIndex], coordinate);
    const progressRatio = coordinateIndex / Math.max(1, coordinates.length - 2);

    return Math.max(1, distanceMeters) * getTrafficTimeWeight(progressRatio);
  });
  const totalWeight = segmentWeights.reduce((sum, weight) => sum + weight, 0);
  const totalDurationMs = durationMinutes * 60_000;
  let elapsedMs = 0;

  return coordinates.map(([latitude, longitude], pointIndex) => {
    const point = {
      latitude,
      longitude,
      timestampIso: new Date(startTime + elapsedMs).toISOString(),
    };
    elapsedMs += totalWeight ? ((segmentWeights[pointIndex] ?? 0) / totalWeight) * totalDurationMs : 0;
    return point;
  });
}

function createRoadRouteFixture(
  vehicleId: string,
  segments: RoadSegmentFixtureInput[],
  options: RoadRouteFixtureOptions = {},
): PlaybackRouteFixture {
  const points: PlaybackRouteFixture["points"] = [];
  const ranges: { input: RoadSegmentFixtureInput; startIndex: number; endIndex: number }[] = [];
  const seenCoordinateKeys = new Set<string>();
  const shouldDedupeCoordinates = options.dedupeCoordinates ?? true;
  const shouldConnectSegments = options.connectSegments ?? true;

  segments.forEach((segment) => {
    const segmentPoints = createTimestampedPoints(segment.geometry, segment.startIso, segment.durationMinutes);
    const shouldShareBoundaryPoint = shouldConnectSegments && points.length > 0 && segmentPoints.length > 1;
    const pointsToAppend = shouldShareBoundaryPoint ? segmentPoints.slice(1) : segmentPoints;
    const uniquePointsToAppend = pointsToAppend.filter((point) => {
      if (!shouldDedupeCoordinates) {
        return true;
      }

      const coordinateKey = `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;

      if (seenCoordinateKeys.has(coordinateKey)) {
        return false;
      }

      seenCoordinateKeys.add(coordinateKey);
      return true;
    });
    const startIndex = shouldShareBoundaryPoint ? points.length - 1 : points.length;
    points.push(...uniquePointsToAppend);
    ranges.push({ input: segment, startIndex, endIndex: Math.max(startIndex, points.length - 1) });
  });

  const denominator = Math.max(1, points.length - 1);

  return {
    vehicleId,
    points,
    tripSegments: ranges.map(({ input, startIndex, endIndex }) => ({
      id: input.id,
      startLabel: "--:--",
      endLabel: "--:--",
      durationLabel: `${input.durationMinutes} min`,
      distanceLabel: "0.0 km",
      stopCount: input.stopCount,
      maxSpeedLabel: "0 km/h",
      averageSpeedLabel: "0 km/h",
      startProgressPercent: (startIndex / denominator) * 100,
      endProgressPercent: (endIndex / denominator) * 100,
    })),
  };
}

const ROUTE_GEOMETRIES = {
  atlasToday1: "gwubaBckmiIdCwBbFsDdYiHWmE_Cu[wBkZ_iAjYu@PcPdEdRrvAhAzGbAjGl@zEjF~^jHdj@ln@nkAfBlDdc@p|@rAlC`Aq@lFgBvC{@fCo@vKeCnSmFrSoFxC_Ab_@cLnW{GzHyBdCs@`Bg@~t@uQhCq@`DoApk@cOfFs@pHk@nBOdD_ApCqAJeFQeKiAgSyBw]oEml@y@oKCa@kEwi@{Dga@wCa^?qN?qAFcBLqBd@{Bb@kBp@yAf@_@~@[`Bm@dEqAtCs@bReFtHqG|EuI|CeH`O}]bAcCj@mA~CkHbA}BhKsUz\\aw@lCqHrKkZ`CwGh@kB`@sApDoMwEwF{EuHqEkHsOoVsw@ilAkUq]mIcOsCcFsAcCmBmD}BwEsDeIqDcIyDwLmC{K{CmMqP_|@uB{K}Gic@kSwuAgEoXaAqG[iBaAgGsCyIcGmUaCeJwPyg@yC}JoHoTwJyZuFyQ_GgTwI__@gM_c@cAkDgBoFaB_EqBgF}HeUiSao@mKw[_Vwv@aIcWgAwEiDcMgCoHmAyDcB}EyA{EoDhEmCrEyA|BgBnC_CzEcGfHwTtVaQtRiBpByBdCoNzOqTnVcLfMsHsUy@eCsR_m@a@mAahAxlAmZn_@oCxAeEtE{SlTiAP}@k@iPqa@}@{B}Tak@}Sai@a@eAcOm_@uEiLqVfOUfD{A|E_LtR_QdZaQhZyKdVaK|[u^xsAuKrg@kIbg@rDVnFZ`@B~V`CXyJlJz@",
  atlasToday2: "omccaBogljImJ{@YxJ_WaCa@CoF[sDWjIcg@tKsg@t^ysA`K}[xKeV`QiZ~PeZ~KuRzA}ETgDeQ}^iTkd@oCsKsAkJiAqK]eDcQkj@gKs[Us@ca@epAdH_IbAiA`@e@rMuNXa@nAsA\\eAHoBSIMMISgT_r@oAcEkQek@{BmHYy@yLi`@eAgDiAsD_Rql@w@mC{A`BmKpLoCxCuL~MiArAaDqJ{Wuz@mA}DyAzA_AfA{HnISPWJUBW?[IYQgGoGaHmHgAiA_FeF{B_CwB}B}EeFuE{EcHmHc@e@s@u@gOwOwA{AYYQUKSKSkAmD}BqHaAuCqEmNS}@Mw@Iu@?q@Bo@L_ANk@Zg@tMsN|AcB`HyHvFkGr@w@fPsQvSkU|DtLbDvK`BpFh@dB",
  atlasToday3: "ocicaBcykkIi@eBaBqFcDwK}DuL~DqEdLgMrGgHvA_BvA_Bf@a@\\QXE\\@VDXJRLTXNXdIfWlAzDxFrQfClH`KxZtJ|[nAuAli@ol@`D_Dj@m@VSVM^GjCSXETKPO~@eAt@}@fBrFjDfKfPzf@vUtq@fA~CvAiBvc@us@fU}^hFiI|AkCvMcTvNqUfL_RhKuPpF{IxBeC|A{AhGaHfCaDd@m@jEgFb@m@h@w@dC}CbCcDx@vAbAdA|BDtDSdAo@dAaAfA_AbBkCf@{ECcFo@wEwAsDqB{BiCEuCE}DtAo@XkGxBw@RQDiE~@yIHmHBkMJqLBiEq@aEqA_FqC_FgDaI_H_CeCoBcCuBwCeBuC_F_H}AaEkA_EsFiTuO{o@{y@uoDmYwmA}Nwn@qQwx@cO}p@}@cEiFgVwBsL_CaO_AoGuB}NYqBQkAw@uFgBeJoGvGaDjEu@bAkD|F}E`CeF^sCA_BCkAAw@B_APo@e@u@c@_A]kDi@{AM{w@kLaF_AiGaC{\\k_@eByDce@gg@_GoGsD}Dk\\}]iKaLuJiKgAmEo@iClAmAxAyAv^__@",
  harborToday1: "_i|baBst|nIw@pOd@rb@x@n`@JrFvDaCMwFy@k`@IkFLyUf@}NtA{NlBcNdEkUhObH|RhJ~UpHtCfCZ|CRbGYdDa@rEiE|ByMbFqd@zUuHzDin@pc@wQbOwT~PcDtCuEhLsV`SeH~F{EtDcGaAqCj@mCXgC?qDc@sCq@_JaEiDyFwB{DqAcDoAkD_AuDaB_He_@{~Ac\\upA}]irAc^orAc^}uAyNak@aOgi@gUqy@uFqUcUs|@sAiFuAwFzEaDtGmF`MkNrW{UX_@dBeDbB}EnF{ZnGk`@j@kDTFR@REROPSJ[Js@Au@Mq@KYOQSMUEUBUJONMT_CmBkByAqG}A}APmEf@aIpAsQvDqF`@eC_BcBiCa@gDgBc]kBo]c@eIoAcVaByZdUsE",
  harborToday2: "ggicaBarvoIfB]xCmAb@mAR{BOoD_E}v@rWgEjUuD|FkATiAmEe{@cFiy@lc@aJlRwEjc@wGnKi@xBt@|CnBvGjFdXh^fFjKnUuR|GiFtA{@rDYbB_AbCiA`@O\\M~DgAhBk@bCkCb_@eKxOgFmCe_@|MgJfSmJlBoE|HaF",
  deltaToday1: "wctaaBe~ykIpYdh@`@p@p@jAxCjFlEoIaDuFm@cAcd@st@aEuGwp@ehAsw@_sA{Xyf@q@kAs@mA{CoFqCuEs@kAwd@mu@sq@{jAaNaUqC}FuCuJq@qE[kCWqBmC_[]}CAwPGaGKaJVcJzB}PpFwWnM{k@`Nql@l@oC|AiJrA}GpB{JzBkLzPwx@pYyqApBmKlA{F|B{KlFaHjCwHpCkN`GeZn@oCnAwFiDqByDyBsH{D_GaDsP_J}@c@iE}B{C_B",
  deltaToday2: "}izaaB_vxlIzC~AhE|B|@b@rP~I~F`DrHzDxDxBx@{Dn@yC~AqIpZuqBx@qFzG_i@bHum@~@{I|Ds_@vGeu@rGu{@fFw}@bGwuAVaIxHkrBh@wNzSktF~Ciq@n@}PhBqf@\\iI?MNwD^eKvDn@^FlOIxVdFnDr@`NbCnTzExf@zKbc@hJpK|BPyFPaF`Dqz@L}C",
  nimbusToday1: "_pzcaBanxiIcU|~@eS|Ywf@xnBaCb@{OhH{BC{BcBqe@em@ivAwiBwElDcEhOm@tBsCnKmB}HkFiTiTk{@uW}dA]sAgEuP{DoMcBcFyHqUk[uy@iE{K}D_LqD{L_EiMgCuJmCkL}BmKsAsH{AeIsCcQaCeQ_BcOmAiNqJabByCqg@sA{OmC_UkGqOwFoBy@sGoBn@kHDs@tFgq@dFwl@r@}Jp@wNj@eNhA_Yf@{TbAkLfZ}qDjCmFfAPfAKjBsAhAsCZmCCuCa@iCBiGl@{F~AiHlCaEfC_E|oAkhB",
  nimbusToday2: "miedaBwuyjIlUg\\~BiD`BcChFoH|`FweHtDiFlEmGd`AgtA|f@}r@brAmkBl[gd@bSaYfHuJ|FeH`JsKtDoDhLmJlCA|E}CfD}Du@oFOgAgBuDqCaCgGeOiCyF{AeDaA_EaAyC_DqHoAaBsAgAcCeBsBo@oBS{@CqAGcECyCMkCKqBEeDHmCgAoE{B{CcB{BaDqL_KuGoFqBoBeEsEiOcNqOaO{FoDky@iv@uTeScBaBw@aDcA{@uAkA}AFuIeIkR}RwTmW~DyD|GwQh@_Hr@o@",
  courierToday1: "wp|`aByj}nI??_@sAs@Uw@?iV`B{BRmCVkQ|@oDN}BNwYbBcHf@kZtBkHn@aZzByGl@kZlCmHb@gX`By@FyGh@}VjBmE^kOr@}Ih@wNz@mCLuRn@aGtHu@nAsAtB{AlDwCyDg@g@eEyD_I_HyK{GaLkE{z@eYkGgA_Kg@iO[uGWqDk@_Eg@qDs@qEyAmJ}DsD{Agv@uXoD{@YIaKuB_Em@uIw@qL}CmMwDmDqAaf@uSoU{J{HyDeAk@V{ADcBKaB]wAm@cA{@m@cAMaAVy@v@k@pA}@{@_LmKaBuAkBaB_HsF[UcEoDqC_C}g@mc@{UgS~Rcu@t@oCvDmOpGaZdF{XvBaNvFkd@ViCbDic@UoCaBgBaEiCrAuJnJwr@|AcL~J_u@|D{OtLk]hHsSl@uF?iF}@_I{BsP_B{E{MiZq^mw@sCjE}c@}_AmBiK}F_Ggc@gg@xVyv@zj@ccBrYg}@tYk|@rLrA`Tt@zGf@~`Ai@zLYb_@M~UhCd[vBlD`AtC|Cd]dU|GxH|KzNlFlIdV~]fQpW",
  courierToday2: "g~jaaBeb~oIgQqWeV_^mFmI}K{N}GyHe]eUuC}CmDaAe[wB_ViCc_@L{LX_aAh@{Gg@aTu@sLsAuCk@eDZobAzd@{p@xP{lBvW}N~BuDcAgBm@dD_`@nZyrDvBmVpC{\\nWu|C~@}LzBkJVsCb@}Ez@uLpDga@`Dw_@z@uKX_DjAoOlAyRlBcWjA{OlAoLlCu[dB}QjPonBtAkQfFue@V_D|AyNj@aFlAwLzEym@nBii@xJwpA|C}_@rB{I`@uF`@mFIyJR{ExBkY|E_j@h@mE`@gFv@eHdC{F\\mE|@iIpAgNRsB\\gJxAl@b@PvJrB`BwAx@oAl@eAjCwJb@sDtEgQyAsDc@eDJmLz@gEnn@k`A",
  atlasY1: "goobaBab|kIcBuMhe@iUr@_@`Ag@eG}b@_@cC}@kGmAcI{@cEaCuJmEiOiUmv@w[g{@wCaIoBeFqAeDaAoD]mAy@aEKsECy@Kex@AiFAwOE_z@?kCk@}Mk@sI_AwImC_Qq@eDoCcNmE_QkEuNy@uEi@uEe@yJNuGN{BZsCrA{KpH_q@l@iPJqBXwIVqHTeGVkGp@qU~EcrALsCJsBPsET}FhBkFBkAp@sUnAw\\DkABq@DcAP_FDaANoJaELeDXuAV}AZqDfBaYlB_Il@aj@dEqD^aLk@sEC_Ga@cLqDgJsGeIuKiGwJWg@k@gAcEuFmBiD_C}DcDeFs@cAkGiIkIkF{DuDoQcW}HgK{MaT_B}CqAaDoDgKs@aCo@oCi@}Cw@eFkCqRUoBmAiHoBaNcHoBo@EiAEoBNqA`@sCbCyNvNyMzMyHtH}@|@cA`AyBvBiCdCfDbPvAdHh@~Av@~BlGpQhAxDhDnK|CrIvGzO~J}HfH}FhK_J`BPjAhAdEtQ_AnJv@tBzM~Et@XRHfCfAfBcR",
  atlasY2: "}eybaByj{lIgBbRgCgASIu@Y{M_Fw@uB~@oJeEuQkAiAaBQiK~IgH|F_K|HwG{O}CsIiDoKiAyDeDmT]uB]kB{AyH~BgBlA{@hE}CtGcEtVqLnJwEfAi@hAi@zBsBVe@xAcCp@oCoBaNeSuvA[uBw@cF{CqTqEa\\gDoUiD{WmFoi@YsCYgDkA{L_AaKiLwpAmAmRu@uMOiCcJydAa@wEu@sIq@mHuCmE]mCe@aBm@kAq@s@q@e@w@]KEsBImCXsL~AmLbAgId@aFNkIDu@?qDMwPu@oDWaAIkGo@aKsA{O_DoJgCyGuBsI{CuHiDqHoDgU{Mwk@gc@g[aVyVoRoIoGcFyDnAkCl@yA|BeBtH_RtUek@~BoG|F_NzCiHvA}C`CkDvBmBhAeAjBu@nB_@fCQ`D?rCDt@L|@VdBCbAFz@Dz@Ip@e@n@y@XsAFu@B_ACwB?cSIoBSiBAqE?gB?gHAgH?kAAw\\iC?gBA]Wa@KgA?_@H_@V_BAaBOeAW_A[w@e@_Aq@}AiAuAe@sBc@YE}@OeAI_CAQ?gDCyIAi@?q@c@o@q@s@}A]_BOoBC{LNs{@A}ExPK|@It@c@l@w@f@hAl@fCNtC?`M",
  atlasW1: "qm_caBg}fjI`D@pOVdX|BzMvA`NjBdc@bGhiAhMrz@zJpEl@pXvC`fAhLtPnBj@FbKpA`yB|U~UxBxa@fBxHNz_@i@bXiAlAG|BSjD[ntAsL`SuCvWcEdXaF|Oh@hLi@bNQlQIhRuAdNwA`PmBvJqAdWuEzDk@dBSpF_AzDw@bCuEdGeLfa@q{@rEcKdHsPtAeDnE}LhD}K|@gFp@{D~@}HbAwO~Cqd@dCak@xDkk@`HeeA~Cue@~Emv@dHqgAtEot@bA{NvGs`AVeEl@kKb@cJmEaB}EaAqKgCczA__@{JoBmkAwW}DaAqs@uO}YsGq\\mHwTg@kt@mPql@iM{bAeVbAuNlGu|@jXqoEt@{Kt@}KbD{d@|Cic@rGcXnBoJXoIQ_h@eA_[iBsUgKuz@{C}TyDmTqBqS{DcXwCyUKy@UeByAuJeByKqCuGw@yAuHuN{AcF_Lc^wFgR_Oof@sAmEkIaYs@{D{AqKY}BS{AeG}b@_@cC}@kGmAcI{@cEaCuJmEiOiUmv@w[g{@wCaIoBeFqAeDaAoD]mAy@aEKsECy@Kex@AiFAwOE_z@?kCk@}Mk@sI_AwImC_QeBz@aJlI",
  atlasW2: "s}qbaBeaklImSjR_c@l_@}Q|Q{Ce@xCq^l@kHkBmYgo@hWyMpFkw@f\\aAsJs`@GsCJwCJ{NB{FF_AJ}@Xu@^{CfBSRk@`@uB`BgAaCWk@w@eBaHqJaFuHs@_A{G_KsGuJuAiDcDqD}C{DiGoEaK{Pa@u@q@aAiCyElBoHb@eBjFkUb@mBlC{MfBo[RwCzAaC|IqLnBaKfBsH~b@su@hYem@bTan@|By@~DsMvFuKrd@onAdMy\\f@qAJ_@^}@`BsEj@{AxB_HmBiD_C}DcDeFs@cAkGiIkIkF{DuDoQcW}HgK{MaT_B}CqAaDoDgKs@aCo@oCi@}Cw@eFkCqRUoBmAiHoBaNeSuvA[uBw@cF{CqTqEa\\gDoUiD{WmFoi@YsCYgDkA{LkHtAuB`@eDZaHPuMHcXDkG?_GAkLUeKUo@Ci@]m@c@yB{AoA_@LsED}C`@sW`@m]?o@?eC?q@?iFCkESia@?mLAgEGwSCaI",
  deltaY1: "gt_baBczukImFkTp@m@gGaU{RnQc@^eB`Bo@gCyHgYe@eBeBzAiB~AeAoE_AaDiQau@cHyX_Reu@i@sBGYSu@iBoHc@eBdGwFt@q@fEyElGqIhF{I`EuIrG}PhJ_X~M{_@nPse@zPse@zUup@rB}FzQug@|CiHlEgG`CoBl@c@jA{@vG{ElBGlD}@`B_AxAuA`ByBn@kAp@aBl@gBt@kDh@aENwCDyCSqH]}Ci@uCuBmGmAwBwAgBsAiAyAy@qAe@uAUiAIiABu@L}AVoJaAyAGqAEoBSuCcAoDcCgc@kj@yk@{r@mDoEmD_Ec`@ed@{x@ybAoReWqDyEiDkF{BgDgJgRcHiTkKga@_@wAaCmI{Ep@uBdB[V}@v@eDpC}CdFaDfDiOhXeEzH}Qd\\iHpM}CvFuCrF{CtFmOhXmAxBo@|Ai@hBqBxGgSb~@gEpRbBrAt@z@vA`BzFpEdMsGdCH",
  deltaY2: "edjbaBajllIeCIeMrG{FqEwAaBu@{@cBsAyGpZ_FnSu@zAcC|E}AyCgBiDmE}I{F_LkD{Gs@wA{GsNsRs^oQw\\kIiMoCsCmCeC{BqAuJkFuOqE{GmD{GqGyHcLw@_B{DqI{CmH_BeC_C}BkCcAeCWyBOTeGVkGp@qU~EcrALsCJsBPsET}FhBkFBkAp@sUnAw\\DgA",
} as const;

const CONTINUOUS_TODAY_ROUTE_GEOMETRIES = {
  atlas1: "k~tbaBkwwjI|DtMpAfEnBvFrA`E~CoDbDsEyA{E}AkEqIuUaJqT{c@ouAaYy|@_Zc~@gEaQ{B{HsA}DeCaHeCeHmDoI}Pch@wQal@m@uBc@cBqAcFgAuGiAiHUsAiBqLaDmQ_EmSyBwLa@uB[}AmAkG}@wE}@wE]uAmCgLcLyf@c\\ycBoAsKeBkPgIcx@KyAIsAeBmMf@{ECcFo@wEwAsD}B}MSiA]{B}@wGmHm_Am@_HOiB}AoRuD{`@wCeYeCgTQ}Au@iIaA{Ig@sFwGgj@Y_CIu@m@}E]qEMsBSeD?kAVqEt@aH`f@esBrGcYPu@zDkQhRwx@VcA`BmHoFsEgBpHU~@kRjx@gE|POp@{BtJuBrJwR|y@kCyAk@e@yGsF",
  atlas2: "q|~baBk}}kIxGrFj@d@jCxAs@|DiBvSaGjWmEfSu@lGIzAA`A@zDBjBNlE`@fFFv@bA`NnGzh@LfAfAvI~@fIvB`RjAxLfCnWbFvl@NjBp@hIbBxUjD~e@EzHGxAIrAe@~Io@XkGxBw@RQDiE~@yIHmHBkMJqLBiEqA_FqC_FgDaI_H_CeCoBcCuBwCeBuC_F_H}AaEkA_EsFiTuO{o@{y@uoDmYwmA}Nwn@qQwx@cO}p@}@cEiFgVwBsL_CaO_AoGuB}NYqBQkAw@uFgBeJsA}F]kBiEuTwByKkIq^qYuzAkDyQaHc\\[yAa@qB{A{HqAoGeAcGyGk_@uEuZo@gEiAuHiCsQ{@gGq@qGu@uFmNqhAsAsLw@uLu@c`Ai@{Tc@cNwB}c@yHmrAmD_x@GcAQsCg@eJa@}Gc@oGUqC[_EaH_y@o@gJg@_J]cJIsECwDGyG@mGFgHLkHzAa`@nAaKZeFLcFJgRBkPGaYFkP~Bmf@NkNB{B@oACgGAm@nEYlS_BxR}ArHAx_@~AlDXlD\\E~DEpEY|PiBtIm@fEmArUmA|U",
  atlas3: "_wicaBkhfmIeAhSWhQeMsAcOw@cBSgo@gO{BMm@wGOmG?uJ{@uCm@mB~Bmf@NkNB{B@oACgGAm@CaKaSfBqCVgAH_Ff@mQdBiNdA}Er@aWzGyCbB__BpO{PgBgFSqe@nEyBR{Fh@MqMKiKi@gj@cAueAwA{_Bi@kn@iAuoAEkFUaWaAqhAE}DUc]EyG\\iL_Acx@MmLKaJmB{o@EkA?cB@wD@{Ab@c@`@m@Xw@R}@JaADeACeAIcAS}@Yy@_@o@c@c@CcF?y@@iBPyZh@{u@@_B]kN?qLeAskFCsT_@wl@CiBDmGz@y@n@sA\\eBHoBIoB]eBm@uA{@y@uA]uAR_B~Aw@xCKzBLzBd@lBx@rAfAp@PfG@tB`@n]}ABAhI@hEyd@gCiA|v@I~E",
  harbor1: "gjidaBkkmoIVsInAwKfBuSjL_mErA}y@r@im@f@cg@N}nAW{v@e@kh@wAuzAKuGd@gGnAgQ|AaUHuDKiKdFGjHI`JIxQaBjCiC`@{DbBad@j@qKja@pKjBnAhAnCvEjNfCrGhPnd@b[gl@bIoJlq@ic@fAs@vf@aZdZyEzNoCxJmDnJoGzJiJbIyMnUks@rC_LjIeW|DsPnBoJ~TyhA`@mBtYd^dC`DpAbBl@aBrBsGl@aG~@uCtC_DnAs@zBmCrKkMr@wB??",
  harbor2: "ymycaB}|opI??s@vBsKjM{BlCoAr@uC~C_AtCm@`GsBrGm@`B`I`K`NnO`QnMtO~InAp@dB`A`O|HlRnKh{@td@~RlKdAt@xCdBnZzP`GdEfD~ClDzDrErHrFpNfC`JjClJjD`LhC~EjFtH|FxEtDvAnEbCvBJZEv@K|Ck@hAUnIuB]}D}@{LyHgfAkEs{@qHy|AsLwtCqBqg@m@wNwD{|@gEu_AiD{u@gDgt@qDsu@{Dkt@aEyt@mHwiA}@mNcDwd@iBqUsAyQyFgt@wGcy@uFoo@iHes@eNirAqKm}@e[cdCeGwb@}DaXsHuh@_Iuh@cOsaAqSirA{Gq~@kFoi@cEoh@gD_i@wBw`@mA{SmAyU}@}PyAeXo@gL{@}OGaAfLu@dNEbHPtH|@xIjBxKhBvN~LhObQlYfj@buAvwCxh@fjAn\\rr@za@z~@jOfYbCbG~GhLbFhGlOzNdAnBjEtCrIfElChA|BdAn@`@Dr@ZzAj@zAn@lA`@f@Z^b@\\n@Vr@Fr@@^G~@Up@c@l@o@fBqBd@Yj@WtBOrJCxI?r]uCl\\{ChUwBbCU|Eg@`AKzD_@vt@yFfXo@jBb@zEW`Ig@bEa@nAEt@?^`Ab@d@x@t@p@Zz@@jMgAxD[rAYt@c@f@]bBoCbA_ClBoBbAUhRcC`MsCrWgIrOcI",
  delta1: "yg`aaBgzlkIsJnCaIzBeD|@rD|c@{XxHqKzCi]~ImA`B]fB{@|TuWmCcBSmCy@sAqDsHmi@oA{G_DaR}CcN{@gE~BgEdEsJxCgKV_B~@sFh@kGTeFCeGaAaKoAgSk@}KAgKKwBs@eLy@cMqAyPgCcOgMekBi@{Li@sJWiHg@{MLw\\BqGOuKi@uJwB}ZiFoz@ImL{@yUKmBEkAu@uViAmLqBgjAKc\\@ue@l@oJRmOFmG@uDJwROaKr@me@j@eaA\\sNEwJSwIeAqK}AoJ}K_}@yDeMw@aLoGsi@[oEo@eJa@sM@iKX{FXwE~@uJ`AyMyCuAqGgC_J}CyM{DoImAyG_@oHDkFLcHiCsjAkb@uuAwg@kI}CcFyDwGuBaCs@",
  delta2: "gxoaaB{iulIiDeAiKsAcIHoHd@uIzCqShJmBz@gJ|DsH|CiInDqHjBgNjDcOdCqGhAsIpAqDPwAAqAKkAQcAWwEwBaA[_ASs@MgHK_RiD_IaBsBOiJq@{XoA{Mm@aI_AmEaB{BkAeDcC|B{KbKuf@lFiXd@cCjAaGx@{Dn@yC~AqIpZuqBx@qFzG_i@bHum@~@{I|Ds_@vGeu@rGu{@fFw}@bGwuAVaIxHkrBh@wNzSktF~Ciq@n@}PhBqf@\\iI?MNwD^eKvDn@^FlOIxVdFnDr@`NbCnTzExf@zKbc@hJpK|BpGrAblAbVvDt@bb@bIhA_J\\aDtE}[|Hkc@xDyPbIqYxHaV~FeLdFcEfJsGi@kFJgFhJql@r@gFhCyQnDq\\dDwb@zAyFb@gELoELsCtB{l@|Aij@g@cQ\\cK~@iY",
  nimbus1: "qwkcaBukjhImTiWcM}KkJ_H_iAyi@m^eQqVsLuFiChYiuAz@{Cr@kBl@gAn@m@|A{@`Cu@zFPlG?rF[fGm@nEq@vEsA`GoBbGkD~NgJ|T}R`a@}^pFuMt@eBp@wBp@gCt@_Ed@kD^cEVaFHuD?qC?kCG}BKeBYoCY{Bm@aFo@_FgAgFy@yCy@gCsA}CsAeCwAiBmAoAuBsAcB{@sAi@yAY}AOuA@gCHwCd@qF~BoMxIyRnOwF`E_FtCuZxOaJzD_JnEeAf@aAb@gDlAuHtBmFj@aLbBsSfByGb@}Jd@aEH_EFyFH_GGoBSmBYcA[{@_@wAo@qCwAyBwAcD{CiBqBgAwAcAwAq@sAa@{@k@sAq@oBgG{RsG{SwFqRuQ{l@kh@idBaY_`A_EuN_BiFoFkSyO}i@gKab@mXm~@Oq@gGqS_IuRyHuSsCiImCqIic@myAcNwa@qGqQsF{NsNa[qPm\\sAqCuBeEgb@iy@cHgPkF_MoH{SqFsQwZcnAsCcLtC{KfH_Zv@{ErDwNjcAe_E|~@wqDzt@avCbBzBbYjYrCfBbDz@fC?`CQvEmA",
  nimbus2: "wfzcaBonfjIwElAaCPgC?cD{@sCgBcYkYcB{B{t@`vC}~@vqDkcAd_EsDvNwElDcEhOm@tBsCnKmB}HkFiTiTk{@uW}dA]sAgEuP{DoMcBcFyHqUk[uy@iE{K}D_LqD{L_EiMgCuJmCkL}BmKsAsH{AeIsCcQaCeQ_BcOmAiNqJabByCqg@sA{OmC{UsAsJqAwIuB}KiBoJ]{AgBmHsBuH_IuVeDwJwAkDkAoCcK_UoKyRgWof@sVge@uOm[}o@umA}BiE{LqVwFoKu\\os@oAkCgGwJsEuHcQ}[}^eu@mEqKoEoLoHeSuDmKmBqFqBeGyW{bAq@eCyB}I}D{OwBgJmHcYaGgToQon@aHwVg@mBgCkJaCyIyBgIiByGsK}_@yl@{xBmIgZoKo_@q@oCwBaItC{A~DmB|KwFbWqOl@o@`FeEtE_En@e@lJgH`NoKlEoDxEsDvT}PpEyDpFaE|k@se@xEsDvEaEp^_ZvCsCbC}Df@wAf@{AVs@l@cFDwOm@yEgAeGkM{k@mBuJqB_JoJsb@{@iGOaJd@wFdAaG`EsIrMcK|E{DbHaGpBiBbDqGle@a[~NyIrB_AdCsAxCgBdFkBfFcExEeErCoExz@um@jMiK~NeLvJuHxCi@nB_BhA}@vBeBtBqDh\\uVrLaJ~B]|BiBpFcFpBfIbFvWdD|SrFwEvAaBv\\k`@",
  courier1: "upoaaBwf|qIYZgTr]gY~k@_I~RomAu_@OGk@MMEeBc@kBfQ}@nKy@dGyDzY}B~JcAhHWzCo@|JWxKaDt^}C~Sk@bEq@|HeCdWw@tJq@~HcApO@pIMtGmBtT}Fbn@aD~UKr@L`JsAg@mAU_@G[GaLyA{Ga@yVKeE^{KxAeWhGoEtCeCfA_|AnUaIhDcc@dO}CFyIoGaClDq@dAqC~ByN|AkJxF}A`AsKtFw@dBmP|]{Uvh@_AtI}G|DuIhUiAhFiSje@gNn\\iBnEyBbGkExIs@dAyJzGq@h@{}@jbBeCdEom@vfAsJhP{EhIsPnXaGxIeIpJoIzJkF|GeClFeBtEuMnb@u[|fA_GbR{ErMiXpj@gKfStArClB`JtEdTba@_X",
  courier2: "}jkbaBqhupIca@~WuEeTmBaJuAsCcThXgkA~xAqqAnaBqg@jo@mHhFwGbFmLtGoChAiRvFqTtGyC|@iCv@aBh@oCx@~AzKd@rBxBrDjPd_AzNn}@lDrVhE`[HxFlAxSJdLxDrBjD]nHf@nBxAlGfL~CbGp@nAxFrKrDrDdBjEjEhNlB|HjBtIvAbKjBvNLnB|ArW^b^^xMo@xE@lA@tE?fCm@n@c@~@[hAQnAuAZiCn@kAZmDzBsBEoGaAsIgEiE{BkImEqMaH}@KaGo@}IzAmBZ}HpGeBtAoFnK{R`w@gI|[_GvVgId\\gAlE_BrIgBvLeB`TM~EO~Fe@nSQjJaB`_AkArq@IhSqBhBeAh@cLdFyH`FkEtE{GlIgFlKeElMwEnTeElRg@dCq@hDcA`GbEvDfHtMpDnObQlYfj@buAvwCxh@fjAn\\rr@za@z~@jOfYbCbG~GhLbFhGlOzNdAnBjEtCrIfElChA|BdAn@`@Dr@ZzAj@zAn@lA`@f@Z^b@\\n@Vr@Fr@@^G~@Up@c@l@o@fBqBd@Yj@WtBOrJCxI?r]uCl\\{ChUwBbCU|Eg@`AKzD_@vt@yFfXo@jBb@zEW`Ig@bEa@nAEt@?^`Ab@d@x@t@p@Zz@@jMgAxD[rAYt@c@f@]bBoCbA_ClBoBbAUhRcC`MsCrWgIrOcI?",
  courier3: "sn`caB_u~nI??wE{AcGSyMrEqh@lQ}BtAkAmFiAkFcGc_@kEi[sD}\\aGmd@eJgl@sCsQoBiJuJsd@eEcSaAiE}Kkg@YsAiE{Vi@mDs@gIIyDJiF^sDv@}GRwDBcESiC}I}u@{KebAsJs|@kEsi@}AwEu@qAc@e@Js@Au@Mq@KYOQSMUEUBUJONMTK^E`@Ab@Df@J`@N\\TRk@jDoGj`@oFzZcB|EeBdDY^sWzUiNvGyIvF}CpB]TgJnFwGxEm@b@gUfRgMlKaF~DcHbFez@hm@iDdCsHxFcFbE}p@bj@u_@nYyPhNwHbIuI`LeP`Y}IzQ{Rrh@qIdW_GdSoHfXkKtc@gI`b@oDxRgDfUeDpYgC|a@cBre@sA`n@CpBEhBm@~[WzYQb^Xpk@PjOzBruAP|E\\jRbBpn@lDhhAR~^@hCO`G_B~Aw@xCKzBLzBd@lBx@rAfAp@PfG@tB`@n]BjM~@biEFlq@BxDDtMrBc@ZAlDGl@?rA?pf@nD~ADdCL`ADnTf@rBBhJ`@xFPphA`E~EPr@BbCJpDL`L\\V@N@fSbA|AFWtNQnNVnP`@bHPdDhA`KnBhI|B~E~H~P`DfNfB~P`AvGDhDElYaAdDmBlCqAf@mGjAoTn@kPi@m@tE",
} as const;

export const MOCK_PLAYBACK_VEHICLES: Vehicle[] = MOCK_FLEET_FIXTURES.map((vehicle) => vehicle);

export const MOCK_PLAYBACK_ROUTE_FIXTURES: Record<string, Record<string, PlaybackRouteFixture>> = {
  "veh-atlas-12": {
    today: createRoadRouteFixture("veh-atlas-12", [
      { id: "atlas-trip-1", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.atlas1, startIso: "2026-03-29T08:00:00Z", durationMinutes: 8, stopCount: 1 },
      { id: "atlas-trip-2", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.atlas2, startIso: "2026-03-29T08:11:00Z", durationMinutes: 9, stopCount: 2 },
      { id: "atlas-trip-3", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.atlas3, startIso: "2026-03-29T08:23:00Z", durationMinutes: 8, stopCount: 0 },
    ]),
    yesterday: createRoadRouteFixture("veh-atlas-12", [
      { id: "atlas-y-trip-1", geometry: ROUTE_GEOMETRIES.atlasY1, startIso: "2026-03-28T08:03:00Z", durationMinutes: 18, stopCount: 2 },
      { id: "atlas-y-trip-2", geometry: ROUTE_GEOMETRIES.atlasY2, startIso: "2026-03-28T08:28:00Z", durationMinutes: 16, stopCount: 1 },
    ]),
    "last-7-days": createRoadRouteFixture("veh-atlas-12", [
      { id: "atlas-w-trip-1", geometry: ROUTE_GEOMETRIES.atlasW1, startIso: "2026-03-23T07:55:00Z", durationMinutes: 19, stopCount: 1 },
      { id: "atlas-w-trip-2", geometry: ROUTE_GEOMETRIES.atlasW2, startIso: "2026-03-23T08:22:00Z", durationMinutes: 21, stopCount: 2 },
      { id: "atlas-w-trip-3", geometry: ROUTE_GEOMETRIES.atlasY1, startIso: "2026-03-24T09:05:00Z", durationMinutes: 17, stopCount: 2 },
      { id: "atlas-w-trip-4", geometry: ROUTE_GEOMETRIES.atlasY2, startIso: "2026-03-25T12:15:00Z", durationMinutes: 15, stopCount: 1 },
      { id: "atlas-w-trip-5", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.atlas1, startIso: "2026-03-27T08:10:00Z", durationMinutes: 8, stopCount: 1 },
      { id: "atlas-w-trip-6", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.atlas2, startIso: "2026-03-28T08:11:00Z", durationMinutes: 9, stopCount: 2 },
      { id: "atlas-w-trip-7", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.atlas3, startIso: "2026-03-29T08:23:00Z", durationMinutes: 8, stopCount: 0 },
    ], { dedupeCoordinates: false, connectSegments: false }),
  },
  "veh-harbor-07": {
    today: createRoadRouteFixture("veh-harbor-07", [
      { id: "harbor-trip-1", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.harbor1, startIso: "2026-03-29T08:40:00Z", durationMinutes: 8, stopCount: 2 },
      { id: "harbor-trip-2", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.harbor2, startIso: "2026-03-29T08:51:00Z", durationMinutes: 9, stopCount: 1 },
    ]),
    yesterday: createRoadRouteFixture("veh-harbor-07", [
      { id: "harbor-y-trip-1", geometry: ROUTE_GEOMETRIES.harborToday1, startIso: "2026-03-28T10:15:00Z", durationMinutes: 14, stopCount: 1 },
    ]),
    "last-7-days": createRoadRouteFixture("veh-harbor-07", [
      { id: "harbor-w-trip-1", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.harbor1, startIso: "2026-03-23T08:30:00Z", durationMinutes: 8, stopCount: 1 },
      { id: "harbor-w-trip-2", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.harbor2, startIso: "2026-03-24T13:10:00Z", durationMinutes: 10, stopCount: 2 },
      { id: "harbor-w-trip-3", geometry: ROUTE_GEOMETRIES.harborToday1, startIso: "2026-03-26T09:05:00Z", durationMinutes: 14, stopCount: 1 },
      { id: "harbor-w-trip-4", geometry: ROUTE_GEOMETRIES.harborToday2, startIso: "2026-03-28T16:45:00Z", durationMinutes: 12, stopCount: 0 },
      { id: "harbor-w-trip-5", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.harbor2, startIso: "2026-03-29T08:51:00Z", durationMinutes: 9, stopCount: 1 },
    ], { dedupeCoordinates: false, connectSegments: false }),
  },
  "veh-delta-24": {
    today: createRoadRouteFixture("veh-delta-24", [
      { id: "delta-trip-1", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.delta1, startIso: "2026-03-29T08:12:00Z", durationMinutes: 7, stopCount: 3 },
      { id: "delta-trip-2", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.delta2, startIso: "2026-03-29T08:22:00Z", durationMinutes: 8, stopCount: 1 },
    ]),
    yesterday: createRoadRouteFixture("veh-delta-24", [
      { id: "delta-y-trip-1", geometry: ROUTE_GEOMETRIES.deltaY1, startIso: "2026-03-28T08:20:00Z", durationMinutes: 18, stopCount: 3 },
      { id: "delta-y-trip-2", geometry: ROUTE_GEOMETRIES.deltaY2, startIso: "2026-03-28T08:44:00Z", durationMinutes: 13, stopCount: 1 },
    ]),
    "last-7-days": createRoadRouteFixture("veh-delta-24", [
      { id: "delta-w-trip-1", geometry: ROUTE_GEOMETRIES.deltaY1, startIso: "2026-03-23T07:35:00Z", durationMinutes: 18, stopCount: 2 },
      { id: "delta-w-trip-2", geometry: ROUTE_GEOMETRIES.deltaY2, startIso: "2026-03-24T08:15:00Z", durationMinutes: 13, stopCount: 1 },
      { id: "delta-w-trip-3", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.delta1, startIso: "2026-03-25T11:20:00Z", durationMinutes: 8, stopCount: 3 },
      { id: "delta-w-trip-4", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.delta2, startIso: "2026-03-26T14:40:00Z", durationMinutes: 9, stopCount: 1 },
      { id: "delta-w-trip-5", geometry: ROUTE_GEOMETRIES.deltaToday1, startIso: "2026-03-28T09:10:00Z", durationMinutes: 12, stopCount: 0 },
      { id: "delta-w-trip-6", geometry: ROUTE_GEOMETRIES.deltaToday2, startIso: "2026-03-29T08:22:00Z", durationMinutes: 8, stopCount: 1 },
    ], { dedupeCoordinates: false, connectSegments: false }),
  },
  "veh-nimbus-03": {
    today: createRoadRouteFixture("veh-nimbus-03", [
      { id: "nimbus-trip-1", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.nimbus1, startIso: "2026-03-29T06:05:00Z", durationMinutes: 9, stopCount: 0 },
      { id: "nimbus-trip-2", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.nimbus2, startIso: "2026-03-29T06:17:00Z", durationMinutes: 11, stopCount: 1 },
    ]),
    yesterday: createRoadRouteFixture("veh-nimbus-03", [
      { id: "nimbus-y-trip-1", geometry: ROUTE_GEOMETRIES.nimbusToday1, startIso: "2026-03-28T06:45:00Z", durationMinutes: 13, stopCount: 0 },
      { id: "nimbus-y-trip-2", geometry: ROUTE_GEOMETRIES.nimbusToday2, startIso: "2026-03-28T11:25:00Z", durationMinutes: 15, stopCount: 1 },
      { id: "nimbus-y-trip-3", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.nimbus1, startIso: "2026-03-28T15:55:00Z", durationMinutes: 9, stopCount: 0 },
    ], { dedupeCoordinates: false, connectSegments: false }),
    "last-7-days": createRoadRouteFixture("veh-nimbus-03", [
      { id: "nimbus-w-trip-1", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.nimbus1, startIso: "2026-03-23T06:05:00Z", durationMinutes: 9, stopCount: 0 },
      { id: "nimbus-w-trip-2", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.nimbus2, startIso: "2026-03-24T06:20:00Z", durationMinutes: 11, stopCount: 1 },
      { id: "nimbus-w-trip-3", geometry: ROUTE_GEOMETRIES.nimbusToday1, startIso: "2026-03-26T07:10:00Z", durationMinutes: 13, stopCount: 0 },
      { id: "nimbus-w-trip-4", geometry: ROUTE_GEOMETRIES.nimbusToday2, startIso: "2026-03-28T11:25:00Z", durationMinutes: 15, stopCount: 1 },
      { id: "nimbus-w-trip-5", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.nimbus2, startIso: "2026-03-29T06:17:00Z", durationMinutes: 11, stopCount: 1 },
    ], { dedupeCoordinates: false, connectSegments: false }),
  },
  "veh-courier-19": {
    today: createRoadRouteFixture("veh-courier-19", [
      { id: "courier-trip-1", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier1, startIso: "2026-03-29T07:58:00Z", durationMinutes: 8, stopCount: 0 },
      { id: "courier-trip-2", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier2, startIso: "2026-03-29T08:09:00Z", durationMinutes: 11, stopCount: 1 },
      { id: "courier-trip-3", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier3, startIso: "2026-03-29T08:23:00Z", durationMinutes: 13, stopCount: 1 },
    ]),
    yesterday: createRoadRouteFixture("veh-courier-19", [
      { id: "courier-y-trip-1", geometry: ROUTE_GEOMETRIES.courierToday1, startIso: "2026-03-28T07:35:00Z", durationMinutes: 12, stopCount: 0 },
      { id: "courier-y-trip-2", geometry: ROUTE_GEOMETRIES.courierToday2, startIso: "2026-03-28T09:45:00Z", durationMinutes: 15, stopCount: 1 },
      { id: "courier-y-trip-3", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier1, startIso: "2026-03-28T13:10:00Z", durationMinutes: 8, stopCount: 0 },
      { id: "courier-y-trip-4", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier2, startIso: "2026-03-28T16:20:00Z", durationMinutes: 11, stopCount: 1 },
    ], { dedupeCoordinates: false, connectSegments: false }),
    "last-7-days": createRoadRouteFixture("veh-courier-19", [
      { id: "courier-w-trip-1", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier1, startIso: "2026-03-23T07:58:00Z", durationMinutes: 8, stopCount: 0 },
      { id: "courier-w-trip-2", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier2, startIso: "2026-03-23T08:09:00Z", durationMinutes: 11, stopCount: 1 },
      { id: "courier-w-trip-3", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier3, startIso: "2026-03-24T08:23:00Z", durationMinutes: 13, stopCount: 1 },
      { id: "courier-w-trip-4", geometry: ROUTE_GEOMETRIES.courierToday1, startIso: "2026-03-25T09:30:00Z", durationMinutes: 12, stopCount: 0 },
      { id: "courier-w-trip-5", geometry: ROUTE_GEOMETRIES.courierToday2, startIso: "2026-03-26T12:45:00Z", durationMinutes: 15, stopCount: 1 },
      { id: "courier-w-trip-6", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier3, startIso: "2026-03-27T14:05:00Z", durationMinutes: 17, stopCount: 2 },
      { id: "courier-w-trip-7", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier2, startIso: "2026-03-28T16:20:00Z", durationMinutes: 11, stopCount: 1 },
      { id: "courier-w-trip-8", geometry: CONTINUOUS_TODAY_ROUTE_GEOMETRIES.courier3, startIso: "2026-03-29T08:23:00Z", durationMinutes: 13, stopCount: 1 },
    ], { dedupeCoordinates: false, connectSegments: false }),
  },
};
