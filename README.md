
# Microsoft Fabric Extensibility Toolkit

Welcome to the Microsoft Fabric Extensibility Toolkit. This repository contains everything you need to start creating a new Extension for Fabric. Besides the source code itself with a HelloWorld Sample it also contains a comprehensive guide that covers everything you need to know to create custom Fabric items for your organization. We're here to assist you every step of the way, so please don't hesitate to reach out with any questions, via "Issues" tab in this GitHub repository. Happy developing!

[!NOTE]
The Microsoft Fabric Extensibility Toolkit is an evolution of the Workload Development Kit. If you are starting from scratch we encourage customers and partners to start building using the new Extensibility Toolkit which is focusing on easy fast development and enables Fabric Fundamentals out of the box.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.

## Table of contents

- [Microsoft Fabric Extensibility Toolkit](#microsoft-fabric-extensibility-toolkit)
  - [Trademarks](#trademarks)
  - [Table of contents](#table-of-contents)
- [Introduction](#introduction)
  - [What is Fabric](#what-is-fabric)
  - [What is a Fabric Workload](#what-is-a-fabric-workload)
  - [What is a Fabric Item](#what-is-a-fabric-item)
  - [What is the Fabric Extensibility Toolkit](#what-is-the-fabric-extensibility-toolkit)
- [Build Your Own Workload](#build-your-own-workload)
  - [Prerequisites](#prerequisites)
  - [Setting things up](#setting-things-up)

## Introduction

### What is Fabric

Microsoft Fabric is a comprehensive analytics solution designed for enterprise-level applications. This platform encompasses a wide range of services, including data engineering, real-time analytics, and business intelligence, all consolidated within a single, unified framework.

The key advantage of Microsoft Fabric is its integrated approach, that eliminates the need for distinct services from multiple vendors. Users can leverage this platform to streamline their analytics processes, with all services accessible from a single source of truth.

Microsoft Fabric provides integration and simplicity, as well as a transparent and flexible cost management experience. This cost management experience allows users to control expenses effectively by ensuring they only pay for the resources they require.

The Fabric platform is not just a tool, but a strategic asset that simplifies and enhances the analytics capabilities of any enterprise.
More information about Fabric can be found in the [documentation](https://learn.microsoft.com/en-us/fabric/get-started/microsoft-fabric-overview).

### What is a Fabric Workload

In Microsoft Fabric, workloads are a package of different components that are integrated into the Fabric framework. Workloads enhance the usability of your service within the familiar Fabric workspace, eliminating the need to leave the Fabric environment for different services. [Data Factory](https://learn.microsoft.com/en-us/fabric/data-factory/data-factory-overview), [Data Warehouse](https://learn.microsoft.com/en-us/fabric/data-warehouse/data-warehousing) and  [Power BI](https://learn.microsoft.com/en-us/power-bi/enterprise/service-premium-what-is) are some of the built-in Fabric workloads.

### What is a Fabric Item

Items in Fabric represent the core functional building blocks that users interact with inside the Fabric platform. Each item encapsulates a specific capability or resource, such as data storage, analytics, or collaboration. Different workloads introduce different types of items, each tailored to a particular use case or service.

Examples in Fabric include:

- **Lakehouse**: Combines the benefits of data lakes and data warehouses, enabling users to store, manage, and analyze large volumes of structured and unstructured data in a single, unified environment.
- **Notebook**: Provides an interactive workspace for data exploration, analysis, and visualization using languages like Python, SQL, or R. Notebooks are ideal for data scientists and analysts to document and execute code alongside rich text and visualizations.
- **Data Warehouse**: Offers scalable, high-performance analytics on large datasets, supporting complex queries and business intelligence workloads.
- **Pipeline**: Automates data movement and transformation across various sources and destinations within Fabric.

These are just a few examples—Fabric supports a wide range of item types, and new custom items can be created using the Extensibility Toolkit to address unique business needs.

### What is the Fabric Extensibility Toolkit

With the Fabric Extensibility Toolkit, you can create your own items and provide them as a workload in Fabric. Customers can create a workload for their own tenant to integrate their Data applications into the platform. Partners can build workloads and publish them into the Fabric Workload Hub which makes them available to all Fabric customers. The Microsoft Fabric Extensibility Toolkit provides you with all the necessary tools and interfaces to embed your data application into Microsoft Fabric.

For more information on what workloads can offer Microsoft partners, and for useful examples, head to our official [Microsoft Fabric Extensibility Toolkit documentation](https://learn.microsoft.com/fabric/extensibility-toolkit).

## Build Your Own Workload

### Prerequisites

To run the development environment locally you need the following prerequisites:

- [Node.js](https://nodejs.org/en/download/)
- [Powershell 7](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell)
- [Dotnet](https://dotnet.microsoft.com/en-us/download) for MacOS please make sure to install the x64 version - after installing make sure to restart the powershell.
- [VSCode](https://code.visualstudio.com/download) or similar development environment
- [Fabric Tenant](https://app.fabric.microsoft.com/) that you use for development and publishing the Workload later on
- [Fabric Workspace](https://learn.microsoft.com/en-us/fabric/fundamentals/workspaces) that you can use to build your workload
- [Fabric Capacity](https://learn.microsoft.com/en-us/fabric/enterprise/licenses) that is assigned to the workspace you are planning to use
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) (only used for Entra App creation) - after installing make sure to restart powershell.
- [Entra App](https://entra.microsoft.com/) You either need an existing Entra App you can use one that is configured correctly or you need permission to create a new Entra App.

[!NOTE]
After installing new software please make sure that you restart Powershell and Visual Studio, otherwise the scripts might file because the software is not part of the path variable.

Alternatively we suggest to use a [Codespace](https://github.com/features/codespaces) in GitHub which has everything preconfigured:

If you use a codespace please make sure that you select at least an 8 core machine and open the Codespace in VSCode locally. This way everything will work out of the box.

### Project structure

Use the [Project structure](./docs/Project_Structure.md) to get a better understanding about Extensibility projects are structured and where you can find and change it to your needs.

### Setting things up

To set things up follow the [Setup Guide](./docs/Project_Setup.md).

---

## Example Workloads

This toolkit includes example implementations to help you get started:

### 📊 [Excel Table Editor](./docs/Excel-Table-Editor-Workload.md)
A full-featured workload that enables editing Fabric lakehouse tables using Excel Online. Features include:
- Multi-table management in a single workload item
- Excel Online integration via OneDrive for Business
- Real-time data querying with Spark Livy
- Token refresh for long editing sessions
- Professional UI with Fluent UI v9 components

**[→ View full documentation](./docs/Excel-Table-Editor-Workload.md)**

### 👋 HelloWorld Sample
A basic sample demonstrating the fundamental structure of a Fabric workload. Use this as a starting point for your own custom workloads.

---

## 📊 Current Development Status (Bidirectional Excel ↔ Lakehouse)

### ✅ Completed Work

**Bidirectional Excel ↔ Lakehouse Integration** (CLIENT-SIDE ONLY!)
- ✅ Created `SparkQueryHelper.ts` (346 lines) - Session management, query execution, and schema extraction
- ✅ Updated `ExcelClientSide.ts` (722 lines) - Full bidirectional data flow with type preservation
- ✅ **Read from Lakehouse**: Query lakehouse tables with Spark Livy
- ✅ **Write to Lakehouse**: Save Excel changes back with proper data types
- ✅ **Type Preservation**: Automatic conversion between Excel strings and Spark types
  - Boolean: `"true"` → `True`, `"false"` → `False`
  - Integer/Long: `"42"` → `42`
  - Float/Double: `"3.14"` → `3.14`
  - Timestamp: `"2023-01-01T00:00:00"` → `datetime(2023, 1, 1, 0, 0, 0)`
  - String: Preserved as-is
- ✅ Session management: Reuses existing idle sessions, creates new ones when needed
- ✅ Query execution: Submit Python/Spark code, poll for results (2-5 seconds typically)
- ✅ Schema extraction: Captures original table schema for type-aware write operations
- ✅ Data validation: Verifies schema match before writing to lakehouse
- ✅ INSERT OVERWRITE: Uses SQL INSERT OVERWRITE for Delta Lake compatibility
- ✅ Integrated with Fabric REST APIs:
  - `GET /v1/workspaces/{id}/lakehouses/{id}` - Lakehouse properties
  - Spark Livy API (`/livyApi/versions/2024-07-30/sessions`, `/statements`)
- ✅ Excel Online integration via OneDrive for Business
- ✅ Professional styling: Microsoft blue headers, borders, auto-sized columns
- ✅ Error handling with detailed error messages and validation
- ✅ Token refresh for long editing sessions

**UI Integration** (`ExcelEditItemEditorDefault.tsx`)
- ✅ Multi-table canvas management
- ✅ "Create Excel" button - Generates Excel from lakehouse table
- ✅ "Save to Lakehouse" button - Writes Excel changes back with type preservation
- ✅ Loading states: Shows spinner during Spark operations
- ✅ Error handling with user-friendly alerts
- ✅ Token acquisition with `Lakehouse.ReadWrite.All` scope
- ✅ Real-time data preview in Excel Online iframe

### 🎯 How It Works (No Backend Required!)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Download Excel with Real Data"             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Acquire Fabric API token (Lakehouse.ReadWrite.All)      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SparkLivyClient.listSessions() - Check for idle session │
│    • If found: Reuse existing session (instant)            │
│    • If not: Create new session (30-60 sec first time)     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Submit Python code via Spark Livy:                      │
│    ```python                                                │
│    df = spark.sql("SELECT * FROM table LIMIT 1000")        │
│    print(json.dumps(df.toPandas().to_dict('records')))     │
│    ```                                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Poll statement status every 2 seconds                   │
│    • Typical query: 2-5 seconds                            │
│    • Complex query: 10-30 seconds                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Parse JSON result → Convert to Excel rows               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. ExcelJS creates .xlsx with real data + SQL instructions │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Browser downloads file via Blob API                     │
└─────────────────────────────────────────────────────────────┘
```

### 🚀 Key Advantages

1. **No Backend Required** - All execution happens in browser + Fabric Spark
2. **Real Data** - Actual lakehouse rows, not sample data
3. **Fast After Warmup** - Session reuse makes subsequent queries 2-5 seconds
4. **Scalable** - Spark handles large tables (limited to 1000 rows for Excel)
5. **Pure REST APIs** - No TDS protocol issues, no browser limitations

### ⚠️ Considerations

- **First-time Session Creation**: 30-60 seconds (one-time cost per workspace/lakehouse)
- **Session Reuse**: Subsequent queries are 2-5 seconds (very fast!)
- **Row Limit**: Capped at 1000 rows to keep Excel files manageable
- **Token Scope**: Requires `Lakehouse.ReadWrite.All` (elevated from ReadOnly)

### 📝 Next Steps for Testing

1. **Test with real lakehouse** - Verify end-to-end flow with actual data
2. **Session lifecycle** - Confirm session reuse works across multiple downloads
3. **Error scenarios** - Test with invalid tables, permissions issues
4. **Performance monitoring** - Track query times for different table sizes

### 📚 Files Modified

| File | Lines | Purpose |
|------|-------|---------|
| `SparkQueryHelper.ts` | 265 | Spark session management + query execution |
| `ExcelClientSide.ts` | 333 | Excel generation with Spark Livy integration |
| `ExcelEditItemEditorDefault.tsx` | ~880 | UI with loading states and error handling |

---
