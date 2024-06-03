import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { InputText } from 'primereact/inputtext'
import { InputNumber } from 'primereact/inputnumber'
import { ColumnGroup } from 'primereact/columngroup'
import { Row } from 'primereact/row'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'

import './App.css'
import { Message } from 'primereact/message'

const currencies = [
  {
    name: 'USD',
    symbol: '$',
  },
  {
    name: 'EUR',
    symbol: '€',
  },
  {
    name: 'GBP',
    symbol: '£',
  },
]

function App() {
  const tableRef = useRef()

  const [rows, setRows] = useState(
    JSON.parse(localStorage.getItem('rows')) || []
  )

  const [currency, setCurrency] = useState(currencies[0])

  const priceFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.name,
  })

  const percentageFormat = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const priceDisplay = field => rowData => {
    return priceFormat.format(rowData[field])
  }

  const priceEditor = options => {
    return (
      <InputNumber
        inputStyle={{ maxWidth: '10rem', textAlign: 'right' }}
        value={options.value}
        onValueChange={e => options.editorCallback(e.value)}
        mode="currency"
        currency={currency.name}
        locale="en-US"
      />
    )
  }

  const percentageEditor = options => {
    return (
      <InputNumber
        inputStyle={{ maxWidth: '5rem', textAlign: 'right' }}
        value={options.value}
        onValueChange={e => options.editorCallback(e.value)}
        suffix="%"
        maxFractionDigits={2}
        locale="en-US"
      />
    )
  }

  const percentageDisplay = field => rowData => {
    return percentageFormat.format(rowData[field] / 100)
  }

  const cellEditor = options => {
    if (options.field === 'marketValue') return priceEditor(options)
    if (options.field === 'targetAllocation') return percentageEditor(options)
    return textEditor(options)
  }

  const textEditor = options => {
    return (
      <InputText
        style={{ maxWidth: '10rem', textAlign: 'right' }}
        type="text"
        value={options.value}
        onChange={e => options.editorCallback(e.target.value)}
      />
    )
  }

  const deleteRow = index => {
    setRows(prevRows => {
      const newRows = [...prevRows]
      newRows.splice(index, 1)
      return newRows
    })
  }

  const okTotalTargetAllocation = useMemo(() => {
    return (
      Math.round(rows.reduce((acc, row) => acc + row.targetAllocation, 0)) ===
      100
    )
  }, [rows])

  const computed = useMemo(() => {
    const totalMarketValue = rows.reduce((acc, row) => acc + row.marketValue, 0)

    const computedRows = rows.map(row => {
      const currentAllocation = totalMarketValue
        ? (row.marketValue / totalMarketValue) * 100
        : 0
      return {
        ...row,
        currentAllocation,
        buySell: currentAllocation
          ? (row.targetAllocation * row.marketValue) / currentAllocation -
            row.marketValue
          : 0,
      }
    })

    const adjustment = Math.max(
      ...computedRows
        .filter(d => d.buySell < 0)
        .map(d =>
          d.targetAllocation ? Math.abs(d.buySell / d.targetAllocation) : 0
        ),
      0
    )

    return computedRows.map(row => ({
      ...row,
      buyOnly: row.buySell + row.targetAllocation * adjustment,
    }))
  }, [rows])

  useEffect(() => {
    localStorage.setItem('rows', JSON.stringify(rows))
  }, [rows])

  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="Totals:" footerStyle={{ textAlign: 'right' }} />
        <Column
          align={'right'}
          footer={priceFormat.format(
            computed.reduce((acc, row) => acc + (row.marketValue ?? 0), 0)
          )}
        />
        <Column
          align={'right'}
          footer={percentageFormat.format(
            computed.reduce(
              (acc, row) => acc + (row.currentAllocation ?? 0),
              0
            ) / 100
          )}
        />
        <Column
          align={'right'}
          footer={percentageFormat.format(
            computed.reduce(
              (acc, row) => acc + (row.targetAllocation ?? 0),
              0
            ) / 100
          )}
        />
        <Column
          align={'right'}
          footer={priceFormat.format(
            computed.reduce((acc, row) => acc + (row.buySell ?? 0), 0)
          )}
        />
        <Column
          align={'right'}
          footer={priceFormat.format(
            computed.reduce((acc, row) => acc + (row.buyOnly ?? 0), 0)
          )}
        />
        <Column />
        <Column />
      </Row>
    </ColumnGroup>
  )

  const onRowEditComplete = e => {
    let {
      newData: { asset, marketValue, targetAllocation },
      index,
    } = e

    setRows(prevRows => {
      const newRows = [...prevRows]
      newRows[index] = {
        asset,
        marketValue,
        targetAllocation,
      }
      return newRows
    })
  }

  const addAsset = useCallback(
    () =>
      setRows(prevRows => [
        ...prevRows,
        {
          asset: '',
          marketValue: 0,
          targetAllocation: 0,
        },
      ]),
    []
  )

  const header = (
    <div className="flex justify-content-between">
      <div className="flex align-items-center gap-2">
        <Button
          icon="pi pi-plus"
          severity="info"
          className="mr-2"
          tooltip="Add asset"
          onClick={addAsset}
        />
        <Button
          type="button"
          icon="pi pi-download"
          className="mr-2"
          severity="help"
          onClick={() => tableRef.current.exportCSV({ selectionOnly: false })}
          tooltip="Export CSV"
        />
        <Dropdown
          value={currency}
          onChange={e => setCurrency(e.value)}
          options={currencies}
          optionLabel="name"
        />
      </div>
      {!okTotalTargetAllocation && (
        <Message severity="warn" text="Allocation 100% required" />
      )}
    </div>
  )

  return (
    <div>
      <DataTable
        ref={tableRef}
        header={header}
        stripedRows
        value={computed}
        footerColumnGroup={footerGroup}
        editMode="row"
        onRowEditComplete={onRowEditComplete}
        emptyMessage="Add one or more assets to get started."
        rowEditValidator={data => {
          if (!data.asset) {
            return false
          }
          return {}
        }}
      >
        <Column field="asset" sortable header="Asset" editor={cellEditor} />
        <Column
          align={'right'}
          field="marketValue"
          header="Market value"
          body={priceDisplay('marketValue')}
          editor={cellEditor}
        />
        <Column
          align={'right'}
          field="currentAllocation"
          header="Current allocation"
          body={percentageDisplay('currentAllocation')}
        />
        <Column
          align={'right'}
          field="targetAllocation"
          header="Target allocation"
          body={percentageDisplay('targetAllocation')}
          editor={cellEditor}
        />
        <Column
          field="buySell"
          header="Buy/sell"
          align={'right'}
          body={priceDisplay('buySell')}
          bodyClassName={data =>
            data.buySell < 0 ? 'text-red-500' : 'text-green-500'
          }
        />
        <Column
          field="buyOnly"
          header="Buy only"
          align={'right'}
          body={priceDisplay('buyOnly')}
          bodyClassName={data => data.buyOnly > 0 && 'text-green-500'}
        />
        <Column
          rowEditor
          headerStyle={{ width: '10%', minWidth: '8rem' }}
          bodyStyle={{ textAlign: 'center' }}
        ></Column>
        <Column
          headerStyle={{ width: '2rem', minWidth: '2rem' }}
          body={(_, { rowIndex }) => (
            <Button
              icon="pi pi-trash"
              rounded
              text
              severity="danger"
              aria-label="Delete"
              onClick={() => deleteRow(rowIndex)}
            ></Button>
          )}
        ></Column>
      </DataTable>
    </div>
  )
}

export default App
