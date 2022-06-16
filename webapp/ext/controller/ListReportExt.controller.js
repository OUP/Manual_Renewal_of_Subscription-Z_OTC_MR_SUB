sap.ui.define(
  ["sap/m/MessageBox", "sap/m/MessageToast", "sap/ui/core/format/DateFormat"],
  function (MessageBox, MessageToast, DateFormat) {
    "use strict";

    let _sIdPrefix;
    let _sDefferedId = new Date().getTime().toString();
    let _oDateFormat = DateFormat.getDateInstance({ pattern: "yyyyMMdd" });

    return {
      onInit: function () {
        _sIdPrefix =
          "oup.otc.zotcmrsub::sap.suite.ui.generic.template.ListReport.view.ListReport::ZOTC_C_ARIA_ORDERS--";

        let oListReport = this.byId(_sIdPrefix + "listReport");
        oListReport.setShowFullScreenButton(true);

        // deferred group
        let oDataModel = this.getView()
          .getController()
          .getOwnerComponent()
          .getModel();
        oDataModel.setDeferredGroups(
          oDataModel.getDeferredGroups().concat([_sDefferedId])
        );
      },

      onAfterRendering: function () {
        const oContentTable = this.byId(_sIdPrefix + "GridTable");
        oContentTable.attachBusyStateChanged(this._onBusyStateChanged);
      },

      _onBusyStateChanged: function (oEvent) {
        const bBusy = oEvent.getParameter("busy");
        if (!bBusy) {
          const oTable = oEvent.getSource();
          let oTpc = null;
          // grid table
          if (sap.ui.table.TablePointerExtension) {
            oTpc = new sap.ui.table.TablePointerExtension(oTable);
          } else {
            oTpc = new sap.ui.table.extensions.Pointer(oTable);
          }
          // columns
          const aColumns = oTable.getColumns();
          for (let i = aColumns.length; i >= 0; i--) {
            oTpc.doAutoResizeColumn(i);
          }
          aColumns[8].setWidth("300px");
        }
      },

      handleRenewSubscription: function (_oEvent) {
        const oView = this.getView();
        const oModel = oView.getModel();
        const oTable = this.byId(_sIdPrefix + "GridTable");
        const oPlugins = oTable.getPlugins()[0];
        const aSelectedIndex = oPlugins.getSelectedIndices();
        let sVbelnPosnr = "";
        let oContext, oRowData, sDate;

        for (let i = 0, iLen = aSelectedIndex.length; i < iLen; i++) {
          oContext = oTable.getContextByIndex(aSelectedIndex[i]);
          oRowData = oContext.getObject() || null;
          sDate = "";

          if (oRowData.renew_date) {
            sDate = _oDateFormat.format(oRowData.renew_date);
          }

          sVbelnPosnr += `${oRowData.vbeln}-${oRowData.posnr}-${oRowData.ship_to}-${oRowData.trial_rule}-${sDate}|`;
        }

        // start busy indicator
        oView.setBusy(true);

        // function import to create PO / contract
        oModel.callFunction("/RENEW_SUBSCRIPTION", {
          method: "POST",
          urlParameters: {
            vbeln_posnr: sVbelnPosnr,
          },
          success: function (oData, _oResponse) {
            // stop busy indicator
            oView.setBusy(false);

            // success message
            MessageToast.show(oData.Message);
          },
          error: function (_oError) {
            try {
              // stop busy indicator
              oView.setBusy(false);

              // read error message
              const sResponseText = _oError.responseText;
              const oResponse = JSON.parse(sResponseText);
              const sErrorText = oResponse.error.message.value;

              // size compact
              const bCompact = !!oView.$().closest(".sapUiSizeCompact").length;

              // error message
              MessageBox.error(sErrorText, {
                styleClass: bCompact ? "sapUiSizeCompact" : "",
              });
            } catch (error) {
              // unable to read error message
            }
          },
        });
      },
    };
  }
);
