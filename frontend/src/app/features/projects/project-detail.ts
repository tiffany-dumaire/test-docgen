import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MeetingCalendar } from '../../shared/meeting-calendar';
import { RichTextEditor } from '../../shared/rich-text-editor';
import { ProjectTracking } from './project-tracking';
import { ProjectExtrasService } from '../../core/services/project-extras.service';
import { Meeting, JournalEntry, ProjectLink } from '../../core/models';
import { MembershipService, Membership } from '../../core/services/membership.service';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { DocumentService } from '../../core/services/document.service';
import { FormService } from '../../core/services/form.service';
import { FormTemplate, OnlineForm, Project, ProjectDocument } from '../../core/models';
import { ToastService } from '../../core/services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, FormsModule, DatePipe, MatTabsModule, MeetingCalendar, RichTextEditor, ProjectTracking],
  template: `
    @if (project(); as p) {
      <div class="row between">
        <div class="row" style="gap:.9rem;align-items:center">
          @if (p.logoUrl) { <img class="proj-logo" [src]="p.logoUrl" alt="logo projet" /> }
          <div>
            <h1 style="margin:0">{{ p.name }}</h1>
            <div class="muted">{{ p.clientName }} · {{ p.reference || 'sans référence' }}
              @if (p.parent) { · sous-projet }
            </div>
          </div>
        </div>
        <div class="row" style="gap:.5rem">
          <a class="btn btn-ghost" [routerLink]="['/projects', p.id, 'edit']">Éditer</a>
          <a class="btn btn-primary" [routerLink]="['/documents/new']" [queryParams]="{ project: p.id }">+ Document</a>
        </div>
      </div>

      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
        <mat-tab label="Vue d'ensemble">
          <div class="tabpad">
            <div class="card"><h3>📝 Description</h3>
              @if (p.description) { <p style="white-space:pre-line;margin:0">{{ p.description }}</p> }
              @else { <p class="muted" style="margin:0">Aucune description.</p> }
            </div>

            @if (p.children?.length) {
              <div class="card"><h3>🌳 Sous-projets</h3>
                @for (ch of p.children; track ch.id) {
                  <div class="row between" style="padding:.3rem 0"><a [routerLink]="['/projects', ch.id]">{{ ch.name }}</a><span class="tag">{{ ch.status }}</span></div>
                }
              </div>
            }
            @if (p.clientsDetail?.length) {
              <div class="card"><h3>🤝 Clients associés</h3>
                <div class="row wrap" style="gap:.4rem">@for (cl of p.clientsDetail; track cl.id) { <span class="badge badge-type">{{ cl.name }}</span> }</div>
              </div>
            }
            <div class="grid-cards">
              <div class="card"><h3>👤 Contacts client</h3>
                @for (c of clientContacts(p); track c.id) {
                  <div class="contact"><strong>{{ c.fullName }}</strong><div class="muted">{{ c.role }}</div><div class="tag">{{ c.email }} · {{ c.phone }}</div></div>
                } @empty { <div class="muted">Aucun contact client.</div> }
              </div>
              <div class="card"><h3>🧑‍💼 Contacts internes</h3>
                @for (c of internalContacts(p); track c.id) {
                  <div class="contact"><strong>{{ c.fullName }}</strong><div class="muted">{{ c.role }}</div><div class="tag">{{ c.email }} · {{ c.phone }}</div></div>
                } @empty { <div class="muted">Aucun contact interne.</div> }
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Client">
          <div class="tabpad">
            @if (p.clientsDetail?.length) {
              @for (cl of p.clientsDetail; track cl.id) {
                <div class="card">
                  <div class="row between" style="align-items:flex-start">
                    <div class="row" style="gap:.9rem;align-items:center">
                      @if (cl.logoUrl) { <img class="client-logo" [src]="cl.logoUrl" alt="logo client" /> }
                      <div>
                        <h3 style="margin:0">{{ cl.name }}</h3>
                        @if (cl.contactName) { <div class="muted">Contact principal : {{ cl.contactName }}</div> }
                        @if (cl.projectCount) { <div class="tag">{{ cl.projectCount }} projet(s)</div> }
                      </div>
                    </div>
                    <a class="btn btn-sm btn-ghost" [routerLink]="['/clients', cl.id]">Fiche client</a>
                  </div>
                  <div class="infogrid" style="margin-top:.8rem">
                    <div><span class="k">Email</span><span class="v">@if (cl.email) { <a [href]="'mailto:' + cl.email">{{ cl.email }}</a> } @else { — }</span></div>
                    <div><span class="k">Téléphone</span><span class="v">@if (cl.phone) { <a [href]="'tel:' + cl.phone">{{ cl.phone }}</a> } @else { — }</span></div>
                    <div style="grid-column:1/-1"><span class="k">Adresse</span><span class="v" style="white-space:pre-line">{{ cl.address || '—' }}</span></div>
                    @if (cl.notes) { <div style="grid-column:1/-1"><span class="k">Notes</span><span class="v" style="white-space:pre-line">{{ cl.notes }}</span></div> }
                  </div>
                </div>
              }
            } @else if (p.clientName) {
              <div class="card"><h3 style="margin:0">{{ p.clientName }}</h3>
                <p class="muted" style="margin:.4rem 0 0">Aucune fiche client détaillée n'est associée à ce projet.</p></div>
            } @else {
              <div class="card"><p class="muted" style="margin:0">Aucun client associé à ce projet.</p></div>
            }

            <div class="card"><h3>👤 Contacts client</h3>
              @if (clientContacts(p).length) {
                <table><thead><tr><th>Nom</th><th>Rôle</th><th>Email</th><th>Téléphone</th></tr></thead>
                  <tbody>@for (c of clientContacts(p); track c.id) {
                    <tr><td><b>{{ c.fullName }}</b></td><td>{{ c.role || '—' }}</td>
                      <td>@if (c.email) { <a [href]="'mailto:' + c.email">{{ c.email }}</a> } @else { — }</td>
                      <td>{{ c.phone || '—' }}</td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun contact client pour ce projet.</div> }
            </div>

            <div class="card"><h3>🧑‍💼 Contacts internes</h3>
              @if (internalContacts(p).length) {
                <table><thead><tr><th>Nom</th><th>Rôle</th><th>Email</th><th>Téléphone</th></tr></thead>
                  <tbody>@for (c of internalContacts(p); track c.id) {
                    <tr><td><b>{{ c.fullName }}</b></td><td>{{ c.role || '—' }}</td>
                      <td>@if (c.email) { <a [href]="'mailto:' + c.email">{{ c.email }}</a> } @else { — }</td>
                      <td>{{ c.phone || '—' }}</td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun contact interne pour ce projet.</div> }
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Informations complémentaires">
          <div class="tabpad">
            <div class="card"><h3>🧩 Champs personnalisés</h3>
              @if (p.customFieldDefs?.length) {
                <div class="infogrid">
                  @for (def of p.customFieldDefs; track def.key) {
                    <div><span class="k">{{ def.label }}</span><span class="v">{{ cfDisplay(p, def) }}</span></div>
                  }
                </div>
              } @else { <p class="muted" style="margin:0">Aucun champ personnalisé.</p> }
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Instances">
          <div class="tabpad">
            <div class="card"><h3>🖥️ Instances</h3>
              @if (p.instances?.length) {
                <div class="inst-grid">
                  @for (inst of p.instances; track $index) {
                    <a class="inst-card" [href]="instUrl(inst)" target="_blank" rel="noopener">
                      <div class="inst-name">{{ inst.name || 'Instance' }} <span class="material-icons">open_in_new</span></div>
                      @if (inst.ip) { <div class="inst-line"><span class="material-icons">dns</span> {{ inst.ip }}</div> }
                      @if (inst.domain) { <div class="inst-line"><span class="material-icons">language</span> {{ inst.domain }}</div> }
                    </a>
                  }
                </div>
              } @else {
                <p class="muted" style="margin:0">Aucune instance. Ajoutez-en dans <a [routerLink]="['/projects', p.id, 'edit']">l'édition du projet</a>.</p>
              }
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Dépôts Git">
          <div class="tabpad">
            <div class="card"><h3>🌳 Arborescence des dépôts Git</h3>
              @if (p.repos?.length) {
                <div class="repotree">
                  @for (node of repoTree(p.repos!); track node.repo.id) {
                    <div class="repo-node" [style.padding-left.px]="node.depth * 22">
                      <span class="repo-branch">{{ node.depth > 0 ? '└' : '' }}</span>
                      <span class="material-icons repo-ic">folder_open</span>
                      @if (node.repo.url) {
                        <a class="repo-name" [href]="repoUrl(node.repo.url)" target="_blank" rel="noopener">{{ node.repo.name || 'Dépôt' }}</a>
                      } @else { <span class="repo-name">{{ node.repo.name || 'Dépôt' }}</span> }
                      @if (node.repo.component) { <span class="badge badge-type">{{ node.repo.component }}</span> }
                      @if (node.repo.instance) { <span class="repo-inst"><span class="material-icons">dns</span> {{ node.repo.instance }}</span> }
                    </div>
                  }
                </div>
              } @else {
                <p class="muted" style="margin:0">Aucun dépôt. Ajoutez-en dans <a [routerLink]="['/projects', p.id, 'edit']">l'édition du projet</a> (onglet « Dépôts Git »).</p>
              }
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Équipe & accès">
          <div class="tabpad">
            <div class="card"><h3>🛠️ Équipe de développement</h3>
              @if (p.assignments?.length) {
                <table><thead><tr><th>Membre</th><th>Rôle</th><th>Équipe</th><th>Email</th></tr></thead>
                  <tbody>@for (a of p.assignments; track a.id) {
                    <tr><td><b>{{ a.memberName }}</b></td><td>{{ a.role || '—' }}</td><td>{{ a.teamName }}</td><td>{{ a.memberEmail || '—' }}</td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun membre affecté.</div> }
            </div>
            <div class="card"><h3>🔐 Membres & accès</h3>
              @if (members().length) {
                <table><thead><tr><th>Utilisateur</th><th>Email</th><th>Rôles</th><th></th></tr></thead>
                  <tbody>@for (m of members(); track m.id) {
                    <tr><td><b>{{ m.userName || '—' }}</b></td><td>{{ m.userEmail }}</td><td>{{ (m.roles || []).join(', ') || '—' }}</td>
                      <td><button class="btn btn-sm btn-danger" (click)="removeMember(m)">✕</button></td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun utilisateur rattaché.</div> }
              <div class="row" style="gap:.5rem;margin-top:.6rem;flex-wrap:wrap;align-items:end">
                <div class="field" style="margin:0;min-width:200px"><label>Utilisateur</label>
                  <select [(ngModel)]="newUser"><option [ngValue]="null">—</option>
                    @for (u of users(); track u.id) { <option [ngValue]="u.id">{{ u.full_name || u.email }}</option> }</select></div>
                <div class="field" style="margin:0;flex:1;min-width:180px"><label>Rôles (virgules)</label><input [(ngModel)]="newRoles" placeholder="Chef de projet, Validateur" /></div>
                <button class="btn btn-ghost" (click)="addMember()" [disabled]="!newUser">+ Rattacher</button>
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Documents & formulaires">
          <div class="tabpad">
            <div class="card"><div class="row between"><h3>📄 Documents</h3>
              <a class="btn btn-sm btn-primary" [routerLink]="['/documents/new']" [queryParams]="{ project: p.id }">+ Nouveau</a></div>
              @if (documents().length) {
                <table><thead><tr><th>Titre</th><th>Type</th><th>Confidentialité</th><th>Version</th><th></th></tr></thead>
                  <tbody>@for (d of documents(); track d.id) {
                    <tr><td><a [routerLink]="['/documents', d.id]">{{ d.title }}</a></td>
                      <td><span class="badge badge-type">{{ d.docType }}</span></td>
                      <td><span class="badge" [class]="'badge-' + d.confidentiality">{{ d.confidentialityDisplay }}</span></td>
                      <td>v{{ d.currentVersion }}</td>
                      <td><a class="btn btn-sm btn-ghost" [routerLink]="['/documents', d.id]">Ouvrir</a></td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun document.</div> }
            </div>
            <div class="card"><div class="row between"><h3>📝 Formulaires liés</h3>
              <a class="btn btn-sm btn-ghost" [routerLink]="['/forms/new']" [queryParams]="{ project: p.id }">+ Vierge</a></div>
              @if (formTemplates().length) {
                <div class="row" style="gap:.4rem; align-items:center; margin-bottom:.6rem; flex-wrap:wrap">
                  <span class="tag">Générer depuis un modèle :</span>
                  <select [(ngModel)]="selTemplate" style="max-width:260px">
                    <option [ngValue]="null" disabled>— choisir un modèle —</option>
                    @for (ft of formTemplates(); track ft.id) { <option [ngValue]="ft.id">{{ ft.name }}</option> }
                  </select>
                  <button class="btn btn-sm btn-primary" (click)="genForm(p)" [disabled]="!selTemplate">Générer</button>
                </div>
              }
              @if (forms().length) {
                <table><thead><tr><th>Titre</th><th>Modèle</th><th>Lien réduit</th><th>Réponses</th></tr></thead>
                  <tbody>@for (f of forms(); track f.id) {
                    <tr><td><a [routerLink]="['/forms', f.id]">{{ f.title }}</a></td>
                      <td>{{ f.templateName || '—' }}</td>
                      <td><a [href]="f.shortUrl" target="_blank">{{ f.shortUrl }}</a></td><td>{{ f.submissionCount }}</td></tr>
                  }</tbody></table>
              } @else { <div class="muted">Aucun formulaire lié.</div> }
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Suivi de projet">
          <div class="tabpad">
            <app-project-tracking [id]="p.id!" mode="data" />
          </div>
        </mat-tab>

        <mat-tab label="Documents de suivi">
          <div class="tabpad">
            <app-project-tracking [id]="p.id!" mode="diagrams" />
          </div>
        </mat-tab>

        <mat-tab label="Liens utiles">
          <div class="tabpad">
            <div class="card"><h3>🔗 Liens utiles</h3>
              @for (l of links(); track l.id) {
                <div class="row between" style="margin-bottom:.3rem">
                  <div><span class="tag">{{ l.category || '—' }}</span> <a [href]="l.url" target="_blank">{{ l.name }}</a>
                    @if (l.comment) { <div class="muted" style="font-size:.75rem">{{ l.comment }}</div> }</div>
                  <button class="btn btn-sm btn-danger" (click)="delLink(l)">✕</button></div>
              } @empty { <div class="muted">Aucun lien.</div> }
              <div class="row" style="gap:.3rem;flex-wrap:wrap;margin-top:.6rem;align-items:center">
                <select [ngModel]="nlCatSel" (ngModelChange)="onNlCat($event)" style="width:170px">
                  @for (c of linkCategories; track c) { <option [value]="c">{{ c }}</option> }
                  <option value="__custom">Autre (personnalisée)…</option>
                </select>
                @if (nlCatSel === '__custom') { <input [(ngModel)]="nlCat" placeholder="Nouvelle catégorie" style="width:150px" /> }
                <input [(ngModel)]="nlName" placeholder="Nom" style="flex:1;min-width:120px" />
                <input [(ngModel)]="nlUrl" placeholder="https://…" style="flex:1;min-width:140px" />
                <input [(ngModel)]="nlComment" placeholder="Commentaire" style="flex:1;min-width:120px" />
                <button class="btn btn-primary btn-sm" (click)="addLink(p.id!)">+ Ajouter</button></div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Réunions">
          <div class="tabpad">
            <app-meeting-calendar [meetings]="meetings()" />
            <div class="card">
              <h3>➕ Ajouter une réunion</h3>
              <div class="row" style="gap:.3rem;flex-wrap:wrap;align-items:center">
                <input [(ngModel)]="nmTitle" placeholder="Titre" style="flex:1;min-width:140px" />
                <input type="datetime-local" [(ngModel)]="nmDate" style="width:210px" />
                <input [(ngModel)]="nmLoc" placeholder="Lieu / lien" style="flex:1;min-width:140px" />
                <button class="btn btn-primary btn-sm" (click)="addMeeting(p.id!)">+ Ajouter</button>
              </div>
              <div class="listwrap">
                @for (mtg of meetings(); track mtg.id) {
                  <div class="row between mtg-line">
                    <div><b [style.text-decoration]="mtg.cancelled ? 'line-through' : 'none'">{{ mtg.title }}</b>
                      @if (mtg.cancelled) { <span class="chip-cancel">annulée</span> }
                      <span class="muted" style="font-size:.78rem">
                        @if (mtg.date) { · {{ mtg.date | date:'dd/MM/yyyy HH:mm' }} } @if (mtg.location) { · {{ mtg.location }} }
                      </span></div>
                    <div class="row" style="gap:.3rem">
                      @if (!mtg.cancelled) { <button class="btn btn-sm btn-ghost" (click)="cancelMeeting(mtg)">Annuler</button> }
                      <button class="btn btn-sm btn-danger" (click)="delMeeting(mtg)">✕</button>
                    </div>
                  </div>
                } @empty { <div class="muted">Aucune réunion planifiée.</div> }
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Journal">
          <div class="tabpad">
            <div class="card"><h3>📓 Journal du projet</h3>
              <div class="jform">
                <div class="row" style="gap:.3rem;flex-wrap:wrap;align-items:center;margin-bottom:.4rem">
                  <select [(ngModel)]="njCat" style="width:130px"><option value="note">Note</option><option value="decision">Décision</option><option value="risk">Risque</option><option value="action">Action</option><option value="incident">Incident</option><option value="info">Info</option></select>
                  <select [(ngModel)]="njConf" style="width:170px"><option value="public">Public</option><option value="internal">Interne</option><option value="confidential">Confidentiel</option><option value="restricted">Strictement confidentiel</option></select>
                </div>
                <app-rich-text-editor [(value)]="njHtml" />
                <div class="row" style="justify-content:flex-end;margin-top:.4rem">
                  <button class="btn btn-ghost btn-sm" (click)="addJournal(p.id!)" [disabled]="!hasContent(njHtml)">+ Ajouter au journal</button>
                </div>
              </div>

              <div class="row" style="gap:.6rem;align-items:center;margin:.6rem 0 .2rem">
                <label class="muted" style="font-size:.8rem;display:flex;gap:.3rem;align-items:center">
                  <input type="checkbox" [(ngModel)]="showAuto" /> Afficher les entrées automatiques
                </label>
              </div>

              <div class="timeline">
              @for (j of visibleJournal(); track j.id) {
                <div class="jentry" [class.auto]="j.isAutomatic" [style.--jc]="catColor(j)">
                  <div class="jicon">{{ eventIcon(j) }}</div>
                  <div class="jbody">
                    <div class="jmeta">
                      <span class="badge" [class.badge-internal]="j.confidentiality==='internal'" [class.badge-confidential]="j.confidentiality==='confidential'" [class.badge-restricted]="j.confidentiality==='restricted'" [class.badge-public]="j.confidentiality==='public'">{{ j.categoryLabel || j.category }}</span>
                      @if (j.isAutomatic) { <span class="chip-auto">auto</span> }
                      <span class="muted jdate">{{ j.author || '—' }} · {{ j.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    @if (j.bodyHtml) {
                      <div class="rich" [innerHTML]="j.bodyHtml"></div>
                    } @else {
                      <div>{{ j.body }}</div>
                    }
                  </div>
                  @if (!j.isAutomatic) {
                    <button class="btn btn-sm btn-danger jdel" (click)="delJournal(j)">✕</button>
                  }
                </div>
              } @empty { <div class="muted">Aucune entrée.</div> }
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Style du projet">
          <div class="tabpad">
            <div class="card"><h3>🎨 Style du projet</h3>
              @if (styleEntries(p).length) {
                <div class="styles-grid">
                  @for (st of styleEntries(p); track st.key) {
                    <div class="style-row">
                      <span class="style-key">{{ st.key }}</span>
                      @if (st.color) { <span class="style-sw" [style.background]="st.color"></span><span class="tag">{{ st.color }}</span> }
                      @if (st.font) { <span class="tag" [style.font-family]="st.font">{{ st.font }}</span> }
                      @if (st.size) { <span class="tag">{{ st.size }} pt</span> }
                      @if (st.bold) { <span class="tag">gras</span> }
                    </div>
                  }
                </div>
              } @else { <p class="muted" style="margin:0">Aucun style spécifique. Les modèles utilisent les styles par défaut / de l'entreprise.</p> }
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [
    `
      .detail-tabs { margin-top: 1rem; }
      .tabpad { padding-top: 1.2rem; display: flex; flex-direction: column; gap: 1rem; }
      .contact {
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border);
      }
      .contact:last-child {
        border-bottom: none;
      }
      .jform { border: 1px solid var(--border); border-radius: 10px; padding: .6rem; background: var(--bg); margin-bottom: .8rem; }
      .timeline { position: relative; margin-top: .4rem; }
      .timeline::before { content: ''; position: absolute; left: 15px; top: 6px; bottom: 6px; width: 2px; background: var(--border); }
      .jentry { display: flex; gap: .7rem; align-items: flex-start; padding: .5rem 0; position: relative; }
      .jentry.auto .jbody { color: var(--muted); }
      .jicon { width: 32px; height: 32px; flex: none; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: .95rem;
        background: color-mix(in srgb, var(--jc, var(--mat-sys-primary)) 18%, var(--surface)); box-shadow: 0 0 0 4px var(--surface); position: relative; z-index: 1; }
      .jbody { flex: 1; min-width: 0; background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--jc, var(--border)); border-radius: 10px; padding: .5rem .7rem; }
      .jdel { align-self: center; }
      .jmeta { display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; margin-bottom: .15rem; }
      .jdate { font-size: .72rem; }
      .chip-auto { font-size: .62rem; text-transform: uppercase; letter-spacing: .04em; background: var(--border); color: var(--muted); border-radius: 6px; padding: .05rem .35rem; font-weight: 700; }
      .rich :is(h1,h2,h3){ margin:.3em 0; font-size:1rem; }
      .rich ul,.rich ol{ margin:.2em 0 .2em 1.1em; }
      .rich p{ margin:.25em 0; }
      .chip-cancel { font-size: .62rem; text-transform: uppercase; background: #fee2e2; color: #b91c1c; border-radius: 6px; padding: .05rem .35rem; font-weight: 700; margin-left: .3rem; }
      .proj-logo { width: 3.2rem; height: 3.2rem; border-radius: 12px; object-fit: contain; background: #fff; border: 1px solid var(--border); padding: 3px; }
      .client-logo { width: 3rem; height: 3rem; border-radius: 10px; object-fit: contain; background: #fff; border: 1px solid var(--border); padding: 3px; flex: none; }
      .inst-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: .8rem; }
      .inst-card { display: flex; flex-direction: column; gap: .3rem; padding: .8rem .9rem; border: 1px solid var(--border);
        border-left: 4px solid var(--mat-sys-primary); border-radius: 12px; background: var(--surface); text-decoration: none !important;
        color: var(--text); transition: transform .14s ease, box-shadow .16s ease, border-color .14s ease; }
      .inst-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-strong); }
      .inst-name { font-weight: 700; display: flex; align-items: center; gap: .3rem; }
      .inst-name .material-icons { font-size: 15px; color: var(--muted); }
      .inst-line { display: flex; align-items: center; gap: .4rem; font-size: .84rem; color: var(--muted); font-family: ui-monospace, monospace; }
      .inst-line .material-icons { font-size: 15px; }
      .repotree { display: flex; flex-direction: column; gap: .25rem; }
      .repo-node { display: flex; align-items: center; gap: .45rem; padding: .3rem 0; }
      .repo-branch { color: var(--muted); font-family: ui-monospace, monospace; }
      .repo-ic { font-size: 18px; color: var(--mat-sys-primary); }
      .repo-name { font-weight: 600; }
      .repo-inst { display: inline-flex; align-items: center; gap: .25rem; font-size: .78rem; color: var(--muted); font-family: ui-monospace, monospace; }
      .repo-inst .material-icons { font-size: 14px; }
      .infogrid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem 2rem; }
      @media (max-width: 700px) { .infogrid { grid-template-columns: 1fr; } }
      .infogrid .k { display: block; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); font-weight: 700; }
      .infogrid .v { font-size: 1rem; }
      .styles-grid { display: flex; flex-direction: column; gap: .5rem; }
      .style-row { display: flex; align-items: center; gap: .5rem; padding: .3rem 0; border-bottom: 1px solid var(--border); }
      .style-row:last-child { border-bottom: none; }
      .style-key { font-weight: 600; min-width: 120px; text-transform: capitalize; }
      .style-sw { width: 18px; height: 18px; border-radius: 5px; border: 1px solid var(--border); }
    `,
  ],
})
export class ProjectDetail {
  private projects = inject(ProjectService);
  private documentsSvc = inject(DocumentService);
  private formsSvc = inject(FormService);
  private membershipSvc = inject(MembershipService);
  private extras = inject(ProjectExtrasService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @Input() id!: string;
  project = signal<Project | null>(null);
  documents = signal<ProjectDocument[]>([]);
  forms = signal<OnlineForm[]>([]);
  formTemplates = signal<FormTemplate[]>([]);
  selTemplate: number | null = null;
  members = signal<Membership[]>([]);
  users = signal<{ id?: number; full_name?: string; email: string }[]>([]);
  newUser: number | null = null;
  newRoles = '';
  links = signal<ProjectLink[]>([]);
  meetings = signal<Meeting[]>([]);
  journal = signal<JournalEntry[]>([]);
  nlCat='Sharepoint'; nlCatSel='Sharepoint'; nlName=''; nlUrl=''; nlComment='';
  linkCategories = ['Conditions générales', 'Site web', 'Support', 'Sharepoint', 'Gitlab', 'Teamwork'];
  onNlCat(v: string) { this.nlCatSel = v; this.nlCat = v === '__custom' ? '' : v; }
  nmTitle=''; nmLoc=''; nmDate='';
  njCat='note'; njConf='internal'; njHtml='';
  showAuto = true;

  private static EVENT_ICONS: Record<string, string> = {
    document_created: '📄', version_created: '🔄', form_added: '📝',
    form_response: '📥', meeting_added: '📅', meeting_cancelled: '🚫',
    contact_added: '➕', contact_removed: '➖', project_added: '📁',
    team_updated: '🛠️', contact_changed: '✏️',
  };
  eventIcon(j: JournalEntry): string {
    if (j.isAutomatic && j.event) return ProjectDetail.EVENT_ICONS[j.event] || 'ℹ️';
    return ({ note: '🗒️', decision: '✅', risk: '⚠️', action: '⚡',
              incident: '🔥', info: 'ℹ️', event: '•' } as Record<string, string>)[j.category] || '🗒️';
  }
  cfDisplay(p: any, def: { key: string; type?: string }): string {
    const v = (p.customFields || {})[def.key];
    if (v === undefined || v === null || v === '') return '—';
    if (def.type === 'boolean') return v ? 'Oui' : 'Non';
    return String(v);
  }
  styleEntries(p: any): { key: string; color?: string; font?: string; size?: number; bold?: boolean }[] {
    const styles = p.styles || {};
    const out: { key: string; color?: string; font?: string; size?: number; bold?: boolean }[] = [];
    for (const [key, val] of Object.entries(styles)) {
      if (val && typeof val === 'object') {
        const o = val as any;
        out.push({ key, color: o.color, font: o.font, size: o.size, bold: o.bold });
      }
    }
    return out;
  }
  repoUrl(url?: string): string {
    if (!url) return '#';
    return /^https?:\/\//.test(url) ? url : 'https://' + url;
  }
  /** Aplati l'arborescence des dépôts en une liste ordonnée {repo, depth}. */
  repoTree(repos: import('../../core/models').ProjectRepo[]): { repo: import('../../core/models').ProjectRepo; depth: number }[] {
    const byParent = new Map<string, import('../../core/models').ProjectRepo[]>();
    const ids = new Set(repos.map((r) => r.id));
    for (const r of repos) {
      const key = r.parent && ids.has(r.parent) ? r.parent : '__root__';
      (byParent.get(key) ?? byParent.set(key, []).get(key)!).push(r);
    }
    const out: { repo: import('../../core/models').ProjectRepo; depth: number }[] = [];
    const seen = new Set<string>();
    const walk = (key: string, depth: number) => {
      for (const r of byParent.get(key) ?? []) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        out.push({ repo: r, depth });
        walk(r.id, depth + 1);
      }
    };
    walk('__root__', 0);
    for (const r of repos) if (!seen.has(r.id)) out.push({ repo: r, depth: 0 });  // sécurité
    return out;
  }
  instUrl(inst: { url?: string; domain?: string; ip?: string }): string {
    if (inst.url) return /^https?:\/\//.test(inst.url) ? inst.url : 'https://' + inst.url;
    if (inst.domain) return /^https?:\/\//.test(inst.domain) ? inst.domain : 'https://' + inst.domain;
    if (inst.ip) return 'http://' + inst.ip;
    return '#';
  }
  catColor(j: JournalEntry): string {
    const byEvent: Record<string, string> = {
      document_created: '#2E5E8E', version_created: '#2E6B55', form_added: '#6B3F6E',
      form_response: '#2D6E7E', meeting_added: '#806A2E', meeting_cancelled: '#A32638',
      contact_added: '#2F6B45', contact_removed: '#A32638', project_added: '#5B4F8A',
      team_updated: '#A34E2A', contact_changed: '#806A2E',
    };
    if (j.isAutomatic && j.event && byEvent[j.event]) return byEvent[j.event];
    return ({ note: '#5B5A55', decision: '#2F6B45', risk: '#B04A12', action: '#2E5E8E',
              incident: '#A1202A', info: '#2D6E7E', event: '#5B4F8A' } as Record<string, string>)[j.category] || '#5B5A55';
  }
  hasContent(html: string): boolean {
    return !!html && html.replace(/<[^>]*>/g, '').trim().length > 0;
  }
  visibleJournal(): JournalEntry[] {
    const all = this.journal();
    return this.showAuto ? all : all.filter((j) => !j.isAutomatic);
  }

  constructor() {
    setTimeout(() => {
      const pid = +this.id;
      this.projects.get(pid).subscribe((p) => this.project.set(p));
      this.documentsSvc.list({ project: pid }).subscribe((r) => this.documents.set(r.results));
      this.formsSvc.list({ project: pid }).subscribe((r) => this.forms.set(r.results));
      this.formsSvc.templates({ project: pid }).subscribe((r) => this.formTemplates.set(r.results));
      this.loadMembers(pid);
      this.membershipSvc.users().subscribe((r) => this.users.set(r.results));
      this.reloadExtras(pid);
    });
  }

  genForm(p: Project) {
    if (!this.selTemplate) return;
    const ft = this.formTemplates().find((t) => t.id === this.selTemplate);
    this.formsSvc.instantiate(this.selTemplate, { project: p.id, title: ft?.name })
      .subscribe({
        next: (form) => { this.toast.success('Formulaire généré depuis le modèle.'); this.router.navigate(['/forms', form.id]); },
        error: () => this.toast.error('Génération impossible.'),
      });
  }

  reloadExtras(pid: number) {
    this.extras.links(pid).subscribe((r) => this.links.set(r.results));
    this.extras.meetings(pid).subscribe((r) => this.meetings.set(r.results));
    this.extras.journal(pid).subscribe((r) => this.journal.set(r.results));
  }
  addLink(pid: number) {
    if (!this.nlName) return;
    this.extras.addLink({ project: pid, category: this.nlCat, name: this.nlName, url: this.nlUrl, comment: this.nlComment }).subscribe(() => {
      this.nlCat=''; this.nlName=''; this.nlUrl=''; this.nlComment=''; this.reloadExtras(pid); });
  }
  delLink(l: ProjectLink) { if (l.id) this.extras.removeLink(l.id).subscribe(() => this.reloadExtras(+this.id)); }
  addMeeting(pid: number) {
    if (!this.nmTitle) return;
    this.extras.addMeeting({ project: pid, title: this.nmTitle, location: this.nmLoc, date: this.nmDate || null }).subscribe(() => {
      this.nmTitle=''; this.nmLoc=''; this.nmDate=''; this.reloadExtras(pid); });
  }
  delMeeting(m: Meeting) { if (m.id) this.extras.removeMeeting(m.id).subscribe(() => this.reloadExtras(+this.id)); }
  cancelMeeting(m: Meeting) {
    if (!m.id) return;
    if (!confirm(`Annuler la réunion « ${m.title} » ?`)) return;
    this.extras.updateMeeting(m.id, { cancelled: true }).subscribe(() => this.reloadExtras(+this.id));
  }
  addJournal(pid: number) {
    if (!this.hasContent(this.njHtml)) return;
    this.extras.addJournal({ project: pid, category: this.njCat, confidentiality: this.njConf, bodyHtml: this.njHtml }).subscribe(() => {
      this.njHtml=''; this.reloadExtras(pid); });
  }
  delJournal(j: JournalEntry) { if (j.id) this.extras.removeJournal(j.id).subscribe(() => this.reloadExtras(+this.id)); }

  loadMembers(pid: number) {
    this.membershipSvc.list(pid).subscribe((r) => this.members.set(r.results));
  }
  addMember() {
    if (!this.newUser) return;
    const roles = this.newRoles.split(',').map((r) => r.trim()).filter(Boolean);
    this.membershipSvc.create({ user: this.newUser, project: +this.id, roles }).subscribe({
      next: () => { this.newUser = null; this.newRoles = ''; this.loadMembers(+this.id); },
    });
  }
  removeMember(m: Membership) {
    if (m.id) this.membershipSvc.remove(m.id).subscribe(() => this.loadMembers(+this.id));
  }

  clientContacts(p: Project) {
    return p.contacts.filter((c) => c.kind === 'client');
  }
  internalContacts(p: Project) {
    return p.contacts.filter((c) => c.kind === 'internal');
  }
}
