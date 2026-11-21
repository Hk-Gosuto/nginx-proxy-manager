import pjson from "../package.json" with { type: "json" };

export const getBuildVersion = () => {
	const match = /^v?(\d+\.\d+\.\d+)(?:[-+][\w.+-]+)?$/.exec(process.env.NPM_BUILD_VERSION ?? "");
	return match?.[1] ?? pjson.version.split("-")[0];
};
