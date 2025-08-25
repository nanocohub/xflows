import * as core from "@actions/core";
import { ECRClient, GetAuthorizationTokenCommand } from "@aws-sdk/client-ecr";
import { execa } from "execa";

export async function ecrLogin(
	registry: string,
	username: string,
	password: string,
) {
	await execa(
		"docker",
		["login", "--username", username, "--password-stdin", registry],
		{ input: password },
	);
}

export async function ecrLoginWithSDK(region: string) {
	const ecr = new ECRClient({ region });
	const command = new GetAuthorizationTokenCommand({});
	const response = await ecr.send(command);

	const authData = response.authorizationData?.[0];

	if (!authData?.authorizationToken) {
		throw new Error("Failed to get ECR auth token");
	}
	
	const token = authData.authorizationToken;
	const decoded = Buffer.from(token, 'base64').toString('utf-8');
	const [username, pwd] = decoded.split(':');
	const registry = authData.proxyEndpoint!;

	await ecrLogin(registry, username, pwd);
}

export async function buildAndPush(opts: {
	context: string;
	dockerfile: string;
	tags: string[];
	buildArgs: string[];
	labels: string[];
	platforms?: string;
	target?: string;
	cacheMode?: string;
	cacheRegistry?: string;
	cacheTag?: string;
}): Promise<void> {
	const args = [
		"buildx",
		"build",
		opts.context,
		"--file",
		opts.dockerfile,
		"--push",
		"--pull",
	];
	if (opts.platforms) args.push("--platform", opts.platforms);
	if (opts.target) args.push("--target", opts.target);
	for (const t of opts.tags) args.push("--tag", t);
	for (const a of opts.buildArgs) if (a.trim()) args.push("--build-arg", a);
	for (const l of opts.labels) if (l.trim()) args.push("--label", l);

		// Enhanced caching strategy with proper ECR format
		const cacheMode = opts.cacheMode || 'gha';
		const cacheRegistry = opts.cacheRegistry;
		const cacheTag = opts.cacheTag || 'cache';

		switch (cacheMode) {
			case 'hybrid':
				// Use both GHA and ECR cache for maximum performance
				if (!cacheRegistry) {
					core.warning('Hybrid cache requires cacheRegistry, falling back to GHA');
					args.push("--cache-from", "type=gha", "--cache-to", "type=gha,mode=max");
				} else {
					// Ensure proper ECR format - no protocol, correct domain
					const cacheImage = cacheRegistry.startsWith('http') ? cacheRegistry : `${cacheRegistry}:${cacheTag}`;
					args.push("--cache-from", "type=gha");
					args.push("--cache-from", `type=registry,ref=${cacheImage}`);
					args.push("--cache-to", "type=gha,mode=max");
					args.push("--cache-to", `type=registry,ref=${cacheImage},mode=max`);
					core.info(`Using hybrid caching: GHA + ${cacheImage}`);
				}
				break;
			case 'ecr':
				if (!cacheRegistry) {
					core.warning('ECR cache registry not provided, falling back to GHA cache');
					args.push("--cache-from", "type=gha", "--cache-to", "type=gha,mode=max");
				} else {
					// Ensure proper ECR format - no protocol, correct domain
					const cacheImage = cacheRegistry.startsWith('http') ? cacheRegistry : `${cacheRegistry}:${cacheTag}`;
					args.push("--cache-from", `type=registry,ref=${cacheImage}`);
					args.push("--cache-to", `type=registry,ref=${cacheImage},mode=max`);
					core.info(`Using ECR-based caching: ${cacheImage}`);
				}
				break;
			case 'registry':
				if (!cacheRegistry) {
					core.warning('Registry cache not provided, falling back to GHA cache');
					args.push("--cache-from", "type=gha", "--cache-to", "type=gha,mode=max");
				} else {
					const cacheImage = cacheRegistry.startsWith('http') ? cacheRegistry : `${cacheRegistry}:${cacheTag}`;
					args.push("--cache-from", `type=registry,ref=${cacheImage}`);
					args.push("--cache-to", `type=registry,ref=${cacheImage},mode=max`);
					core.info(`Using registry-based caching: ${cacheImage}`);
				}
				break;
			case 'gha':
			default:
				args.push("--cache-from", "type=gha", "--cache-to", "type=gha,mode=max");
				core.info('Using GitHub Actions cache');
				break;
		}

	core.info(`Running: docker ${args.join(" ")}`);
	await execa("docker", args, { stdio: "inherit" });
}

export async function getDigestForTag(imageRef: string): Promise<string> {
	const { stdout } = await execa("docker", [
		"buildx",
		"imagetools",
		"inspect",
		imageRef,
	]);

	const m = stdout.match(/Digest:\s*(sha256:[a-f0-9]+)/i);
	if (!m) throw new Error(`Cannot determine digest for ${imageRef}`);
	return m[1];
}
