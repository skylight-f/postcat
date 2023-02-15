import { Component, OnInit } from '@angular/core';
import { EoNgFeedbackMessageService } from 'eo-ng-feedback';
import { FeatureInfo } from 'eo/workbench/browser/src/app/shared/models/extension-manager';
import { ExtensionService } from 'eo/workbench/browser/src/app/shared/services/extensions/extension.service';
import { Message, MessageService } from 'eo/workbench/browser/src/app/shared/services/message';
import { ApiService } from 'eo/workbench/browser/src/app/shared/services/storage/api.service';
import { has } from 'lodash-es';
import { Subject, takeUntil } from 'rxjs';

import packageJson from '../../../../../../../../package.json';

@Component({
  selector: 'eo-sync-api',
  template: `<extension-select [(extension)]="currentExtension" tipsType="pushAPI" [extensionList]="supportList"></extension-select>`
})
export class PushApiComponent implements OnInit {
  currentExtension = '';
  supportList: any[] = [];
  featureMap: Map<string, FeatureInfo>;
  private destroy$: Subject<void> = new Subject<void>();
  constructor(
    private extensionService: ExtensionService,
    private eoMessage: EoNgFeedbackMessageService,
    private apiService: ApiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initData();
    this.messageService
      .get()
      .pipe(takeUntil(this.destroy$))
      .subscribe((inArg: Message) => {
        if (inArg.type === 'installedExtensionsChange') {
          this.initData();
        }
      });
  }
  initData = () => {
    this.featureMap = this.extensionService.getValidExtensionsByFature('pushAPI');
    this.supportList = [];
    this.featureMap?.forEach((data: FeatureInfo, key: string) => {
      this.supportList.push({
        key,
        ...data
      });
    });
    {
      const { key } = this.supportList?.at(0);
      this.currentExtension = key || '';
    }
  };
  async submit(callback) {
    const feature = this.featureMap.get(this.currentExtension);
    if (!feature) {
      callback(false);
    }
    const action = feature.action || null;
    const module = await this.extensionService.getExtensionPackage(this.currentExtension);
    if (module?.[action] && typeof module[action] === 'function') {
      const [data] = await this.apiService.api_projectExportProject({});

      data.version = packageJson.version;
      try {
        const output = await module[action](data);
        if (has(output, 'status') && output.status !== 0) {
          this.eoMessage.error(output.message);
          callback('stayModal');
          return;
        }
        callback(true);
      } catch (e) {
        console.log(e);
        callback(false);
      }
    }
  }
}
