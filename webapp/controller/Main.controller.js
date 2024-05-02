/*&---------------------------------------------------------------------*
* Citek JSC.
* (C) Copyright Citek JSC.
* All Rights Reserved
*
* Program ID: ZPA_MAP
* Program Summary: Khai báo chỉ tiêu cho báo cáo COPA
* Created on: 06.02.2024
* Created by: NganNM
*&---------------------------------------------------------------------*/

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v2/ODataModel",
    'sap/ui/model/type/String',
    "sap/ui/model/json/JSONModel",
    'sap/m/SearchField',
    'sap/ui/table/Column',
	'sap/m/Column',
	'sap/m/Text',
    'sap/m/ColumnListItem',
	'sap/m/Label',
    'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, ODataModel, TypeString, JSONModel, SearchField,  UIColumn, MColumn, Text, ColumnListItem, Label, Filter, FilterOperator, MessageBox, Fragment) {
        "use strict";

        return Controller.extend("zpamap.controller.Main", {
            globalData : [],
            rawData : [],
            editMode : false,
            onExit: function(){
                //ask to save
            },
            onChangeEditMode: function(){
                this.editMode = !this.editMode
                if (this.editModel){
                    this._haveSaved = false
                }
                let model = this.getView().getModel('mode')
                model.setData({editMode:this.editMode})
            },
            reloadDataFromDB: function(){
                let thatController = this
                this.globalData = []
                this.rawData = []
                thatController.busyDialog.open()
                let rootURL = "https://"+window.location.hostname+"/sap/opu/odata/sap/ZCO_UI_COPA_MAP_BH_O2"
                let rootOdataModel = new ODataModel( rootURL )
                let editModel = new JSONModel({editMode: thatController.editMode})
                this.getView().setModel(editModel,"mode")
                rootOdataModel.read('/ZCO_I_GRP_COPA_BH', {
                    success: function(data){
                        thatController.rawData = data.results
                        thatController.hierarchyOdataToJSON(data.results, false) // convert to oData sang JSON cho tree table

                        let rootJSONModel = new JSONModel({items: thatController.globalData })
                        thatController.getView().setModel(rootJSONModel,"dataJSON")
                        thatController.busyDialog.close()
                    },
                    error: function(error){
                        MessageBox.error(`Error exists: ${JSON.stringify(error)}`)
                        thatController.busyDialog.close()
                    }
                })
            },            
            onInit: function () {
                let thatController = this
                Fragment.load({
                    id: "idZpamapBusyDialog",
                    name: "zpamap.controller.fragment.Busy",
                    type: "XML",
                    controller: this })
                .then((oDialog) => {
                    thatController.busyDialog = oDialog
                    thatController.reloadDataFromDB()
                })
                .catch(error => { MessageBox.error(`Error exists! : ${JSON.stringify(error)}`)})
                
            },
            hierarchyOdataToJSON: function(input, newMode){
                input.sort((a, b) => a.hierarchylevel - b.hierarchylevel);
                for (let index in input) {
                    if (input[index].hierarchylevel == '0'){
                        // bắt đầu đệ quy với root node
                        this.recursionHierarchy(input[index],newMode)
                    } else {
                        break
                    }
                }
            },
            recursionHierarchy(currentNode, newMode){
                //                                                    ____a____  <====hierarchylevel = '0', highernode = undefined (currentNode)
                //                                                   /         \       
                // hierarchylevel = '1', highernode = 'a'=====> ___b___         c <==== hierarchylevel = '1', highernode = 'a'
                //                                             |       |         \   
                // hierarchylevel = '2', highernode = 'b'====> d       e          f <==== hierarchylevel = '2', highernode = 'c'     
                //
                let currentItemList = [] // item của current node
                
                let filterChildNode = this.rawData.filter(node => node.highernode == currentNode.nodeid ); // tìm item của current node (tìm b,c)
                if (filterChildNode && filterChildNode.length > 0){
                    filterChildNode.forEach(childNode => {
                        this.recursionHierarchy(childNode) // tìm item của child node (tìm d,e,f)
                        currentItemList.push({
                            groupid: childNode.groupid,
                            nodedes: childNode.nodedes,
                            negative: childNode.negative,
                            formular: childNode.formular,
                            nodeid : childNode.nodeid,
                            donvi : childNode.donvi,
                            profitcenter : childNode.profitcenter,
                            glaccount : childNode.glaccount,
                            customer : childNode.customer,
                            product : childNode.product,
                            madata : childNode.madata,
                            costcenter : childNode.costcenter,
                            highernode : childNode.highernode,
                            hierarchylevel : childNode.hierarchylevel,
                            newItemMode: childNode.newItemMode ? childNode.newItemMode : false,
                            isUpdate : childNode.isUpdate ? childNode.isUpdate : false,
                            items : childNode.items //<=== insert b vào node a
                        })
                    });
                }                
                if (currentNode.hierarchylevel == '0'){ // nếu là root node, insert trực tiếp vào globalData (insert a vào globalData)
                    this.globalData.push({
                        groupid: currentNode.groupid,
                        nodedes: currentNode.nodedes,
                        negative: currentNode.negative,
                        formular: currentNode.formular,
                        nodeid : currentNode.nodeid,
                        donvi : currentNode.donvi,
                        profitcenter : currentNode.profitcenter,
                        glaccount : currentNode.glaccount,
                        customer : currentNode.customer,
                        product : currentNode.product,
                        madata : currentNode.madata,
                        costcenter : currentNode.costcenter,
                        highernode : currentNode.highernode,
                        hierarchylevel : currentNode.hierarchylevel,
                        newItemMode: currentNode.newItemMode ? currentNode.newItemMode : false,
                        isUpdate : currentNode.isUpdate ? currentNode.isUpdate : false,
                        items : currentItemList                                
                    })
                } else {
                    currentNode.items = currentItemList // nếu là child node, chỉ insert list item tìm thấy (insert d,e vào node b)
                }    
            },
            onAddItem:function (oEvent) {
                //Thêm item
                let currentNode = oEvent.getSource().getParent().getRowBindingContext().getObject()
                if (!currentNode.items){
                    currentNode.items = []
                }
                let newItem = {
                    groupid: currentNode.groupid,
                    highernode : currentNode.nodeid,
                    hierarchylevel : `${Number.parseInt(currentNode.hierarchylevel) + 1}`,
                    newItemMode: true
                }
                currentNode.items.push(newItem)
                this.rawData.push(newItem)
                let dataModel = this.getView().getModel("dataJSON")
                dataModel.setData({items:this.globalData})
            },
            onAddGroup:function(oEvent){
                //Thêm group
                let newGroup = {
                    newItemMode: true,
                    hierarchylevel: '0'
                }
                this.rawData.push(newGroup)
                this.globalData.push(newGroup)
                let dataModel = this.getView().getModel("dataJSON")
                dataModel.setData({items:this.globalData})
            },
            createVHDialog: function(oEvent, currentNode, vhProperty){
                this._currentNodeVH = currentNode
                this._oBasicSearchField = new SearchField();
                this.loadFragment({
                    name: `zpamap.controller.fragment.${vhProperty.fragmentName}`,
                }).then(function(oDialog) {
                    var oFilterBar = oDialog.getFilterBar()
                    this._oVHD = oDialog
    
                    this.getView().addDependent(oDialog);
                    oFilterBar.setFilterBarExpanded(true);
                    oDialog.getTableAsync().then(function (oTable) {
                        let aFilters = []
                        aFilters.push( new Filter("Language", "EQ",'EN') )
                        // For Desktop and tabled the default table is sap.ui.table.Table
                        if (oTable.bindRows) {
                            // Bind rows to the ODataModel and add columns
                            oTable.bindAggregation("rows", {
                                path: `/${vhProperty.entity}`,
                                filters: aFilters,
                                events: {
                                    dataReceived: function() {
                                        oDialog.update();
                                    }
                                }
                            });
                            vhProperty.elements.forEach(value =>{
                                oTable.addColumn( 
                                    new UIColumn({  
                                        label: new Label({text: value.elementName }),
                                        template : new Text({wrapping: false, text: `{${value.element}}`})
                                    }).
                                    data({
                                        fieldName: value.element
                                    })
                                )
                            })                     
                        }
    
                        // For Mobile the default table is sap.m.Table
                        if (oTable.bindItems) {
                            // Bind items to the ODataModel and add columns
                            let cellList = []
                            vhProperty.elements.forEach(value =>{
                                cellList.push(new Label({text: `{${value.element}}`}))
                            })   
                            oTable.bindAggregation("items", {
                                path: `/${vhProperty.entity}`,
                                template: new ColumnListItem({
                                    cells: cellList
                                }),
                                events: {
                                    dataReceived: function() {
                                        oDialog.update();
                                    }
                                }
                            });
                            vhProperty.elements.forEach(value =>{
                                oTable.addColumn(new MColumn({header: new Label({text: value.elementName})}));
                            }) 
                        }
                        oDialog.update();
                    }.bind(this));
                    oDialog.open();
                }.bind(this));
            },            
            onCancelEdit: function(oEvent){
                let thatController = this
                if (!this._haveSaved){
                    MessageBox.warning("Chỉnh sửa chưa được lưu !", {
                        actions: ['Lưu và tiếp tục', 'Huỷ'],
                        emphasizedAction: 'Lưu và tiếp tục',
                        onClose: function (sAction) {
                           if  (sAction == 'Lưu và tiếp tục'){
                            thatController.onSaveChanges()
                           } else {
                            thatController.onChangeEditMode()
                            thatController.reloadDataFromDB()
                           }
                        }
                    });
                } else {
                    this.onChangeEditMode()
                }
            },
            onSaveChanges: function(){
                this._haveSaved = true
                //Lưu data xuống DB
                this.saveData(this.globalData)
                this.onChangeEditMode()
            },
            saveData: function(listEntry){
                let successFuntion = function (respone) {
                    console.log(respone)
                }
                let rootURL = "https://"+window.location.hostname+"/sap/opu/odata/sap/ZCO_UI_COPA_MAP_BH_O2"
                let rootOdataModel = new ODataModel( rootURL )
                if (listEntry && listEntry.length > 0){
                    listEntry.forEach(node => {
                        node.editMode = false
                        if (node.isUpdate){
                            rootOdataModel.update(`/ZCO_I_GRP_COPA_BH('${node.nodeid}')`, {
                                highernode : node.highernode,
                                hierarchylevel : node.hierarchylevel,
                                groupid : node.groupid,
                                profitcenter : node.profitcenter,
                                customer : node.customer,
                                product : node.product,
                                donvi : node.donvi,
                                costcenter : node.costcenter,                                
                                nodedes : node.nodedes,
                                madata : node.madata,
                                negative : node.negative,
                                glaccount : node.glaccount,
                                formular : node.formular
                            }, {
                                success: successFuntion
                            })
                        } else if (node.newItemMode) {
                            rootOdataModel.create(`/ZCO_I_GRP_COPA_BH`, {
                                nodeid : node.nodeid,
                                profitcenter : node.profitcenter,
                                customer : node.customer,
                                product : node.product,
                                donvi : node.donvi,
                                costcenter : node.costcenter,                                      
                                highernode : node.highernode,
                                hierarchylevel : node.hierarchylevel,
                                groupid : node.hierarchylevel == '0' ? node.nodeid : node.groupid,
                                nodedes : node.nodedes,
                                madata : node.madata,
                                negative : node.negative,
                                glaccount : node.glaccount,
                                formular : node.formular
                            }, {
                                success: successFuntion
                            })
                        }
                        this.saveData(node.items)
                    })
                }
   
            },
            onChangeEntry: function(oEvent){
                //Set indicator update nếu như có dòng item được chỉnh sửa
                // UI element -> <HBox> -> Row 
                let currentNode = oEvent.getSource().getParent().getParent().getRowBindingContext().getObject()
                if (!currentNode.newItemMode) {
                    currentNode.isUpdate = true
                }
            },
            _filterTable: function (oFilter) {
                var oVHD = this._oVHD;
    
                oVHD.getTableAsync().then(function (oTable) {
                    if (oTable.bindRows) {
                        oTable.getBinding("rows").filter(oFilter);
                    }
                    if (oTable.bindItems) {
                        oTable.getBinding("items").filter(oFilter);
                    }

                    oVHD.update();
                });
            },
            onFilterBarSearch: function (oEvent) {
                console.log('onFilterBarSearch')
                var aSelectionSet = oEvent.getParameter("selectionSet");
                var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
                    if (oControl.getValue()) {
                        aResult.push(new Filter({
                            path: oControl.getName(),
                            operator: FilterOperator.Contains,
                            value1: oControl.getValue()
                        }));
                    }
                    return aResult;
                }, []);
                this._filterTable(new Filter({
                    filters: aFilters,
                    and: true
                }));
            },            
            onGLAccountValueHeplRequest: function(oEvent){
                let currentNode = oEvent.getSource().getParent().getParent().getRowBindingContext().getObject()
                console.log(currentNode)
                this.createVHDialog(oEvent, currentNode, {
                    entity: "I_GlAccountTextInCompanycode",
                    fragmentName : 'GLAccountVH',
                    elements: [
                        {element : "CompanyCode", elementName : "Company Code"},
                        {element : "GLAccount", elementName : "GLAccount"},
                        {element : "GLAccountName", elementName : "GLAccount Name"}
                    ]
                })
            },
            onValueHelpOkPress: function (oEvent) {
                if (!this._currentNodeVH.newItemMode){
                    this._currentNodeVH.isUpdate = true
                }
                console.log(oEvent)
                var aTokens = oEvent.getParameter("tokens");
                console.log(aTokens)
                aTokens.forEach(token =>{
                    this._currentNodeVH.glaccount = token.getKey()
                })
                let rootJSONModel = new JSONModel({items: this.globalData })
                this.getView().setModel(rootJSONModel,"dataJSON")
                this._oVHD.close();
                
            },
            onValueHelpCancelPress: function () {
                this._oVHD.close();
            },
            onValueHelpAfterClose: function () {
                this._oVHD.destroy();
            },
            onPaste: async function(){

                let pastedData = []
                let thatController = this
                await navigator.clipboard.readText()
                .then(text => {
                    let lines = text.split('\n')
                    lines.forEach((line) => {
                        let fields = line.split('\t')
                        if (!fields){
                            MessageBox.error('File không hợp lệ')
                            return
                        } else {
                            let nodeExist = thatController.rawData.filter(node => node.nodeid == fields[2])
                            if (nodeExist && nodeExist.length > 0) {
                                nodeExist[0].donvi = fields[0]
                                nodeExist[0].madata = fields[1]
                                nodeExist[0].nodeid = fields[2]
                                nodeExist[0].highernode = fields[3]
                                nodeExist[0].hierarchylevel = fields[4]
                                nodeExist[0].nodedes = fields[5]
                                nodeExist[0].negative = fields[6] == 'x' || fields[5] == 'X' ? true : false 
                                nodeExist[0].glaccount = fields[7]
                                nodeExist[0].formular = fields[8]
                                nodeExist[0].profitcenter = fields[9]
                                nodeExist[0].customer = fields[10]
                                nodeExist[0].product = fields[11]
                                nodeExist[0].costcenter = fields[12]
                                nodeExist[0].isUpdate = true
                            } else {
                                pastedData.push({
                                    donvi : fields[0],
                                    madata : fields[1],
                                    nodeid : fields[2],
                                    highernode : fields[3],
                                    hierarchylevel : fields[4],
                                    nodedes : fields[5],
                                    negative : fields[6] == 'x' || fields[5] == 'X' ? true : false ,
                                    glaccount : fields[7],
                                    formular : fields[8],
                                    profitcenter : fields[9],
                                    customer : fields[10],
                                    product : fields[11],
                                    costcenter : fields[12],
                                    newItemMode : true
                                })
                            }
                            
                        }
                    })
                    pastedData.forEach(value =>{
                        thatController.rawData.push(value)
                    })
                    thatController.globalData = []
                    thatController.hierarchyOdataToJSON(thatController.rawData, true) 
                    let rootJSONModel = new JSONModel({items: thatController.globalData })
                    thatController.getView().setModel(rootJSONModel,"dataJSON")
                })
                .catch(err => {
                    MessageBox.error('Failed to read clipboard contents: ' + err.message);
                });
            }
        });
    });
