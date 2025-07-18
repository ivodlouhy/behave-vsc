import * as vscode from 'vscode';


// used only in the extension tests themselves
export class TestWorkspaceConfigWithWkspUri {
	constructor(public testConfig: TestWorkspaceConfig, public wkspUri: vscode.Uri) { }
}

// used in extension code to allow us to dynamically inject a workspace configuration
export class TestWorkspaceConfig implements vscode.WorkspaceConfiguration {

	private envVarOverrides: { [name: string]: string } | undefined;
	private featuresPath: string | undefined;
	private justMyCode: boolean | undefined;
	private multiRootRunWorkspacesInParallel: boolean | undefined;
	private runParallel: boolean | undefined;
	private xRay: boolean | undefined;
	private extraStepPaths: string[] = [];

	// all user-settable settings in settings.json or *.code-workspace
	constructor({
		envVarOverrides, featuresPath: featuresPath, justMyCode,
		multiRootRunWorkspacesInParallel,
		runParallel, xRay
	}: {
		envVarOverrides: { [name: string]: string } | undefined,
		featuresPath: string | undefined,
		justMyCode: boolean | undefined,
		multiRootRunWorkspacesInParallel: boolean | undefined,
		runParallel: boolean | undefined,
		xRay: boolean | undefined
	}) {
		this.envVarOverrides = envVarOverrides;
		this.featuresPath = featuresPath;
		this.justMyCode = justMyCode;
		this.runParallel = runParallel;
		this.multiRootRunWorkspacesInParallel = multiRootRunWorkspacesInParallel;
		this.xRay = xRay;
	}

	get<T>(section: string): T {

		// switch for all user-settable settings in settings.json or *.code-workspace
		//		
		// NOTE: FOR WorkspaceConfiguration.get(), VSCODE WILL ASSIGN IN PREFERENCE:
		// 1. the actual value if one is set in settings.json/*.code-worspace (this could be e.g. an empty string)
		// 2. the default in the package.json (if there is one) 
		// 3. the default value for the type (e.g. bool = false, string = "", dict = {}, array = [])
		// SO WE MUST MIRROR THAT BEHAVIOR HERE
		switch (section) {
			case "envVarOverrides":
				return <T><unknown>(this.envVarOverrides === undefined ? {} : this.envVarOverrides);
			case "featuresPath":
				return <T><unknown>(this.featuresPath === undefined ? "features" : this.featuresPath);
			case "multiRootRunWorkspacesInParallel":
				return <T><unknown>(this.multiRootRunWorkspacesInParallel === undefined ? true : this.multiRootRunWorkspacesInParallel);
			case "justMyCode":
				return <T><unknown>(this.justMyCode === undefined ? true : this.justMyCode);
			case "runParallel":
				return <T><unknown>(this.runParallel === undefined ? false : this.runParallel);
			case "xRay":
				return <T><unknown>(this.xRay === undefined ? false : this.xRay);
			case "extraStepPaths":
				return <T><unknown>(this.extraStepPaths);
			default:
				debugger; // eslint-disable-line no-debugger
				throw new Error("get() missing case for section: " + section);
		}
	}



	inspect<T>(section: string): {
		key: string; defaultValue?: T | undefined; globalValue?: T | undefined; workspaceValue?: T | undefined;
		workspaceFolderValue?: T | undefined; defaultLanguageValue?: T | undefined; globalLanguageValue?: T | undefined;
		workspaceLanguageValue?: T | undefined; workspaceFolderLanguageValue?: T | undefined;
		languageIds?: string[] | undefined;
	} | undefined {

		// switch for all user-settable settings in settings.json or *.code-workspace
		let response;
		switch (section) {
			case "envVarOverrides":
				response = <T><unknown>this.envVarOverrides;
				break;
			case "justMyCode":
				response = <T><unknown>this.justMyCode;
				break;
			case "featuresPath":
				response = <T><unknown>this.featuresPath;
				break;
			case "multiRootRunWorkspacesInParallel":
				response = <T><unknown>this.multiRootRunWorkspacesInParallel;
				break;
			case "runParallel":
				response = <T><unknown>this.runParallel;
				break;
			case "xRay":
				response = <T><unknown>this.xRay;
				break;
			case "extraStepPaths":
				response = <T><unknown>this.extraStepPaths;
				break;
			default:
				debugger; // eslint-disable-line no-debugger
				throw new Error("inspect() missing case for section: " + section);
		}

		return {
			key: "",
			workspaceFolderValue: response,
			workspaceLanguageValue: undefined,
			languageIds: []
		}
	}


	getExpected<T>(section: string, wkspUri?: vscode.Uri): T | undefined {

		const getExpectedFeaturesPath = (): string => {
			switch (this.featuresPath) {
				case "":
				case undefined:
					return "features";
				default:
					return this.featuresPath.trim().replace(/^\\|^\//, "").replace(/\\$|\/$/, "");
			}
		}

		const getExpectedFeaturesUri = (): vscode.Uri => {
			if (!wkspUri)
				throw "you must supply wkspUri to call getExpectedFeaturesUri";
			return vscode.Uri.joinPath(wkspUri, getExpectedFeaturesPath()); //.trim().replace(/^\\|^\//, "").replace(/\\$|\/$/, ""));
		}


		const getExpectedStepsSearchUri = (): vscode.Uri => {
			if (!wkspUri)
				throw "you must supply wkspUri to get the expected getExpectedFullStepsSearchFsPath";
			if (!wkspUri.path.includes("sibling steps folder"))
				return getExpectedFeaturesUri();
			if (!wkspUri.path.endsWith("sibling steps folder 3"))
				return vscode.Uri.joinPath(wkspUri, "steps");
			return vscode.Uri.joinPath(getExpectedFeaturesUri(), "..", "steps");
		}


		// switch for ALL (i.e. including non-user-settable) settings in settings.json or *.code-workspace 
		switch (section) {
			case "envVarOverrides":
				return <T><unknown>this.get("envVarOverrides");
			case "featuresPath":
				return <T><unknown>getExpectedFeaturesPath();
			case "featuresUri":
				return <T><unknown>getExpectedFeaturesUri();
			case "stepsSearchUri":
				return <T><unknown>getExpectedStepsSearchUri();
			case "justMyCode":
				return <T><unknown>(this.get("justMyCode"));
			case "multiRootRunWorkspacesInParallel":
				return <T><unknown>(this.get("multiRootRunWorkspacesInParallel"));
			case "runParallel":
				return <T><unknown>(this.get("runParallel"));
			case "xRay":
				return <T><unknown>(this.get("xRay"));

			default:
				debugger; // eslint-disable-line no-debugger
				throw new Error("getExpected() missing case for section: " + section);
		}
	}


	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	has(section: string): boolean {
		throw new Error('has() method not implemented.');
	}


	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	update(section: string, value: never, configurationTarget?: boolean | vscode.ConfigurationTarget | null, overrideInLanguage?: boolean): Thenable<void> {
		throw new Error('update() method not implemented.');
	}

}
