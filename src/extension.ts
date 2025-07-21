import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface GitProfile {
  name: string;
  email: string;
  user: string;
}

class GitProfileItem extends vscode.TreeItem {
  constructor(
    public readonly profile: GitProfile,
    activeProfile?: GitProfile
  ) {
    super(profile.name, vscode.TreeItemCollapsibleState.None);
    this.description = `${profile.user} <${profile.email}>`;
    this.contextValue = 'gitProfileItem';

    if (
      activeProfile &&
      profile.name === activeProfile.name &&
      profile.email === activeProfile.email &&
      profile.user === activeProfile.user
    ) {
      // Icon als Codicon setzen
      this.iconPath = new vscode.ThemeIcon('check');
      this.tooltip = 'Aktives Profil';
    }
  }
}

class GitProfileProvider implements vscode.TreeDataProvider<GitProfileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<GitProfileItem | undefined | void> = new vscode.EventEmitter<GitProfileItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<GitProfileItem | undefined | void> = this._onDidChangeTreeData.event;
  private profilesPath: string;

  constructor(private context: vscode.ExtensionContext) {
    this.profilesPath = path.join(context.globalStorageUri.fsPath, 'profiles.json');
  }

  getTreeItem(element: GitProfileItem): vscode.TreeItem {
    return element;
  }

  getChildren(): GitProfileItem[] {
    const profiles = this.getProfiles();
    const activeProfile = this.getActiveProfile();
    return profiles.map(profile => new GitProfileItem(profile, activeProfile));
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }


  getProfiles(): GitProfile[] {
    try {
      if (fs.existsSync(this.profilesPath)) {
        const data = fs.readFileSync(this.profilesPath, 'utf-8');
        const obj = JSON.parse(data);
        return Array.isArray(obj.profiles) ? obj.profiles : [];
      }
    } catch (e) {
      vscode.window.showErrorMessage('Fehler beim Laden der Profile.');
    }
    return [];
  }

  saveProfiles(profiles: GitProfile[]) {
    try {
      fs.mkdirSync(path.dirname(this.profilesPath), { recursive: true });
      const activeProfile = this.getActiveProfile();
      fs.writeFileSync(this.profilesPath, JSON.stringify({ profiles, activeProfile }, null, 2), 'utf-8');
    } catch (e) {
      vscode.window.showErrorMessage('Fehler beim Speichern der Profile.');
    }
    this.refresh();
  }

  setActiveProfile(profile: GitProfile) {
    // globalState weiterhin für Kompatibilität setzen
    this.context.globalState.update('activeGitProfile', profile);
    // aktives Profil auch in Datei speichern
    let profiles: GitProfile[] = [];
    try {
      if (fs.existsSync(this.profilesPath)) {
        const data = fs.readFileSync(this.profilesPath, 'utf-8');
        const obj = JSON.parse(data);
        profiles = Array.isArray(obj.profiles) ? obj.profiles : [];
      }
    } catch {}
    try {
      fs.mkdirSync(path.dirname(this.profilesPath), { recursive: true });
      fs.writeFileSync(this.profilesPath, JSON.stringify({ profiles, activeProfile: profile }, null, 2), 'utf-8');
    } catch {}
    this.refresh();
  }

  getActiveProfile(): GitProfile | undefined {
    try {
      if (fs.existsSync(this.profilesPath)) {
        const data = fs.readFileSync(this.profilesPath, 'utf-8');
        const obj = JSON.parse(data);
        if (obj.activeProfile) return obj.activeProfile;
      }
    } catch {}
    // Fallback auf globalState
    return this.context.globalState.get<GitProfile>('activeGitProfile');
  }

  deleteAllProfiles() {
    try {
      if (fs.existsSync(this.profilesPath)) {
        fs.unlinkSync(this.profilesPath);
      }
    } catch (e) {
      vscode.window.showErrorMessage('Fehler beim Löschen der Profile.');
    }
    this.refresh();
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new GitProfileProvider(context);
  vscode.window.registerTreeDataProvider('gitProfileView', provider);

  // profiles.json komplett löschen (inkl. aktivem Profil)
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.deleteProfilesFile', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Wirklich die gesamte Profile-Datei (inkl. aktivem Profil) löschen? Dies kann nicht rückgängig gemacht werden.',
        { modal: true },
        'Löschen', 'Abbrechen'
      );
      if (confirm !== 'Löschen') {
        return;
      }
      try {
        if (fs.existsSync(provider["profilesPath"])) {
          fs.unlinkSync(provider["profilesPath"]);
        }
        // Auch globalState zurücksetzen
        context.globalState.update('activeGitProfile', undefined);
        vscode.window.showInformationMessage('Profile-Datei gelöscht!');
        provider.refresh();
      } catch (e) {
        vscode.window.showErrorMessage('Fehler beim Löschen der Profile-Datei.');
      }
    })
  );

  // Alle Profile löschen
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.deleteAllProfiles', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Wirklich alle Profile löschen?',
        { modal: true },
        'Löschen', 'Abbrechen'
      );
      if (confirm !== 'Löschen') {
        return;
      }
      provider.deleteAllProfiles();
      vscode.window.showInformationMessage('Alle Profile gelöscht!');
    })
  );

  // Profil hinzufügen
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.addProfile', async () => {
      const name = await vscode.window.showInputBox({ prompt: 'Profilname' });
      const email = await vscode.window.showInputBox({ prompt: 'E-Mail' });
      const user = await vscode.window.showInputBox({ prompt: 'Benutzername' });
      if (name && email && user) {
        const profiles = provider.getProfiles();
        profiles.push({ name, email, user });
        provider.saveProfiles(profiles);
        vscode.window.showInformationMessage('Profil hinzugefügt!');
      }
    })
  );

  // Profil bearbeiten
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.editProfile', async (item: GitProfileItem) => {
      const profile = item.profile;
      const name = await vscode.window.showInputBox({ prompt: 'Profilname', value: profile.name });
      const email = await vscode.window.showInputBox({ prompt: 'E-Mail', value: profile.email });
      const user = await vscode.window.showInputBox({ prompt: 'Benutzername', value: profile.user });
      if (name && email && user) {
        const profiles = provider.getProfiles();
        const idx = profiles.findIndex((p: GitProfile) => p.name === profile.name && p.email === profile.email && p.user === profile.user);
        if (idx !== -1) {
          profiles[idx] = { name, email, user };
          provider.saveProfiles(profiles);
          vscode.window.showInformationMessage('Profil bearbeitet!');
        }
      }
    })
  );

  // Profil löschen
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.deleteProfile', async (item: GitProfileItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Profil "${item.profile.name}" wirklich löschen?`,
        { modal: true },
        'Löschen', 'Abbrechen'
      );
      if (confirm !== 'Löschen') {
        return;
      }
      const profiles = provider.getProfiles();
      const idx = profiles.findIndex((p: GitProfile) =>
        p.name === item.profile.name &&
        p.email === item.profile.email &&
        p.user === item.profile.user
      );
      if (idx !== -1) {
        profiles.splice(idx, 1);
        provider.saveProfiles(profiles);
        vscode.window.showInformationMessage('Profil gelöscht!');
      }
    })
  );

  // Profil auswählen
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.selectProfile', async (item: GitProfileItem) => {
      provider.setActiveProfile(item.profile);
      vscode.window.showInformationMessage(`Aktives Profil: ${item.profile.name}`);
    })
  );

  // Git init mit aktivem Profil
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.initWithProfile', async () => {
      const activeProfile = provider.getActiveProfile();
      if (!activeProfile) {
        vscode.window.showWarningMessage('Kein aktives Profil ausgewählt!');
        return;
      }
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        vscode.window.showWarningMessage('Kein Workspace geöffnet!');
        return;
      }
      const cwd = folders[0].uri.fsPath;

      // git init
      exec('git init', { cwd }, (err, stdout, stderr) => {
        if (err) {
          vscode.window.showErrorMessage(`Fehler bei git init: ${stderr}`);
          return;
        }
        // git config user.name
        exec(`git config user.name "${activeProfile.user}"`, { cwd }, (err2) => {
          if (err2) {
            vscode.window.showErrorMessage('Fehler beim Setzen von user.name');
            return;
          }
          // git config user.email
          exec(`git config user.email "${activeProfile.email}"`, { cwd }, (err3) => {
            if (err3) {
              vscode.window.showErrorMessage('Fehler beim Setzen von user.email');
              return;
            }
            vscode.window.showInformationMessage(`Git-Repo initialisiert mit Profil "${activeProfile.name}"`);
          });
        });
      });
    })
  );

  // Git-Repo de-initialisieren (.git-Ordner löschen)
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.deinitRepo', async () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        vscode.window.showWarningMessage('Kein Workspace geöffnet!');
        return;
      }
      const gitDir = path.join(folders[0].uri.fsPath, '.git');
      if (fs.existsSync(gitDir)) {
        try {
          fs.rmSync(gitDir, { recursive: true, force: true });
          vscode.window.showInformationMessage('.git-Ordner entfernt – Repository de-initialisiert.');
        } catch (err: any) {
          vscode.window.showErrorMessage(`Fehler beim Entfernen des .git-Ordners: ${err.message}`);
        }
      } else {
        vscode.window.showWarningMessage('Kein .git-Ordner gefunden.');
      }
    })
  );

  // Profil auf bestehendes Repo anwenden (user.name und user.email setzen)
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.applyProfile', async () => {
      const activeProfile = provider.getActiveProfile();
      if (!activeProfile) {
        vscode.window.showWarningMessage('Kein aktives Profil ausgewählt!');
        return;
      }
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        vscode.window.showWarningMessage('Kein Workspace geöffnet!');
        return;
      }
      const cwd = folders[0].uri.fsPath;

      exec(`git config user.name "${activeProfile.user}"`, { cwd }, (err) => {
        if (err) {
          vscode.window.showErrorMessage('Fehler beim Setzen von user.name');
          return;
        }
        exec(`git config user.email "${activeProfile.email}"`, { cwd }, (err2) => {
          if (err2) {
            vscode.window.showErrorMessage('Fehler beim Setzen von user.email');
            return;
          }
          vscode.window.showInformationMessage(`Git-Profil "${activeProfile.name}" angewendet.`);
        });
      });
    })
  );

  // Aktionen anzeigen
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.showActions', async () => {
      const actions = [
        { label: 'Git init mit aktivem Profil', command: 'gitProfilePicker.initWithProfile' },
        { label: 'Git-Profil auf aktuelles Repository anwenden', command: 'gitProfilePicker.applyProfile' },
        { label: 'Git-Repository de-initialisieren', command: 'gitProfilePicker.deinitRepo' },
        { label: 'Git-Profil hinzufügen', command: 'gitProfilePicker.addProfile' },
        { label: 'Profile-Datei löschen', command: 'gitProfilePicker.deleteProfilesFile' }
      ];
      const picked = await vscode.window.showQuickPick(actions, { placeHolder: 'Aktion auswählen' });
      if (picked) {
        vscode.commands.executeCommand(picked.command);
      }
    })
  );

  // Aktionen für Elemente im Baum anzeigen
  context.subscriptions.push(
    vscode.commands.registerCommand('gitProfilePicker.itemActions', async (item: GitProfileItem) => {
      const actions = [
        { label: 'Als aktiv auswählen', command: 'gitProfilePicker.selectProfile' },
        { label: 'Bearbeiten', command: 'gitProfilePicker.editProfile' },
        { label: 'Löschen', command: 'gitProfilePicker.deleteProfile' }
      ];
      const picked = await vscode.window.showQuickPick(actions, { placeHolder: 'Aktion für Profil auswählen' });
      if (picked) {
        vscode.commands.executeCommand(picked.command, item);
      }
    })
  );
}

export function deactivate() {}
