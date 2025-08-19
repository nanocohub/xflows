import * as core from "@actions/core";
import { execa } from "execa";
export async function ecrLogin(registry, username, password) {
    await execa("docker", ["login", "--username", username, "--password-stdin", registry], { input: password });
}
export async function buildAndPush(opts) {
    const args = [
        "buildx",
        "build",
        opts.context,
        "--file",
        opts.dockerfile,
        "--push",
        "--pull",
    ];
    if (opts.platforms)
        args.push("--platform", opts.platforms);
    if (opts.target)
        args.push("--target", opts.target);
    for (const t of opts.tags)
        args.push("--tag", t);
    for (const a of opts.buildArgs)
        if (a.trim())
            args.push("--build-arg", a);
    for (const l of opts.labels)
        if (l.trim())
            args.push("--label", l);
    // GHA cache
    args.push("--cache-from", "type=gha", "--cache-to", "type=gha,mode=max");
    core.info(`Running: docker ${args.join(" ")}`);
    await execa("docker", args, { stdio: "inherit" });
}
export async function getDigestForTag(imageRef) {
    const { stdout } = await execa("docker", [
        "buildx",
        "imagetools",
        "inspect",
        imageRef,
    ]);
    const m = stdout.match(/Digest:\s*(sha256:[a-f0-9]+)/i);
    if (!m)
        throw new Error(`Cannot determine digest for ${imageRef}`);
    return m[1];
}
