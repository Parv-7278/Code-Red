import React from 'react';
import { Fuel, Utensils, HeartPulse, Wrench } from 'lucide-react';
import ExpandableTelemetryCard from './ExpandableTelemetryCard';

const iconMap = {
  fuel: Fuel,
  food: Utensils,
  medicine: HeartPulse,
  'spare-parts': Wrench,
};

export default function LogisticsOverview({ inventory: inventoryProp, selectedStation = 'Maitri Station' }) {
  const defaultInventory = [
    {
      id: 'fuel',
      name: 'Fuel (ATF-50 / Diesel)',
      amount: '50,200 L',
      percent: 58,
      daysLeft: '43 Days',
      barColor: '#946013',
      iconColor: '#b73b37',
      unit: 'Liters',
      currentValue: 50200,
      interpretation: 'Arctic grade ATF / diesel storage. Consumption rate 1,167 L/day across station heating and generators.',
      recommendation: 'Next refuel tanker expedition scheduled in 35 days.',
      details: [
        { label: 'Total Remaining', value: '50,200 L', color: '#946013' },
        { label: 'Burn Rate', value: '1,167 L / day', color: '#146b80' },
        { label: 'Storage Tank Temp', value: '-4.2°C (Trace Heated)', color: '#187451' },
        { label: 'Reserve Autonomy', value: '43 Days Remaining', color: '#946013' },
      ]
    },
    {
      id: 'food',
      name: 'Food Rations & Hydroponics',
      amount: '3,250 kg',
      percent: 82,
      daysLeft: '67 Days',
      barColor: '#187451',
      iconColor: '#187451',
      unit: 'kg',
      currentValue: 3250,
      interpretation: 'Freeze-dried and dry ration supply nominal for overwintering station crew members.',
      recommendation: 'Cold storage hydroponics module functioning optimally producing fresh greens weekly.',
      details: [
        { label: 'Dry Rations', value: '2,800 kg', color: '#187451' },
        { label: 'Cold Storage Freezer', value: '-22.4°C', color: '#187451' },
        { label: 'Fresh Hydroponics Yield', value: '4.2 kg / week', color: '#146b80' },
        { label: 'Reserve Autonomy', value: '67 Days Remaining', color: '#187451' },
      ]
    },
    {
      id: 'medicine',
      name: 'Medical Supplies & Trauma Kit',
      amount: '620 kg',
      percent: 89,
      daysLeft: '89 Days',
      barColor: '#187451',
      iconColor: '#187451',
      unit: 'kg',
      currentValue: 620,
      interpretation: 'Critical trauma kits, antibiotics, surgical oxygen, and telemedicine consumables in high readiness state.',
      recommendation: 'Routine inventory audit completed; expiry profile 18+ months.',
      details: [
        { label: 'Surgical Trauma Kits', value: '100% Stocked', color: '#187451' },
        { label: 'Medical Oxygen', value: '24 Cylinders (Full)', color: '#146b80' },
        { label: 'Cryo Vaccine Storage', value: '-80.0°C Nominal', color: '#187451' },
        { label: 'Reserve Autonomy', value: '89 Days Remaining', color: '#187451' },
      ]
    },
    {
      id: 'spare-parts',
      name: 'Spare Parts & Maintenance Kit',
      amount: '1,120 kg',
      percent: 74,
      daysLeft: '55 Days',
      barColor: '#187451',
      iconColor: '#187451',
      unit: 'kg',
      currentValue: 1120,
      interpretation: 'Critical replacement parts for wind turbines, generator alternators, snowcats, and HVAC loops.',
      recommendation: 'High-wear seals and hydraulic filters maintained in duplicate stock.',
      details: [
        { label: 'Generator Spares', value: '2 Sets G-01/G-02', color: '#187451' },
        { label: 'Snowmobile Tracks', value: '4 Complete Pairs', color: '#146b80' },
        { label: 'Hydraulic Filters', value: '36 Units In Stock', color: '#187451' },
        { label: 'Reserve Autonomy', value: '55 Days Remaining', color: '#187451' },
      ]
    },
  ];

  const rawInventory = inventoryProp || defaultInventory;
  const inventory = rawInventory.map((item) => ({
    ...item,
    icon: iconMap[item.id] || Fuel,
  }));

  return (
    <div className="logistics-overview-card polaris-card">
      <div className="card-header-simple">
        <span className="card-title">LOGISTICS OVERVIEW</span>
      </div>

      <div className="logistics-table-container">
        <div className="logistics-table-header">
          <span className="col-header col-item">Item</span>
          <span className="col-header col-remaining">Remaining</span>
          <span className="col-header col-days">Days Left</span>
        </div>

        <div className="logistics-table-rows">
          {inventory.map((row) => {
            const Icon = row.icon;
            return (
              <ExpandableTelemetryCard
                key={row.id}
                title={row.name}
                category="LOGISTICS INVENTORY"
                value={row.amount}
                percent={row.percent}
                status={row.percent < 40 ? 'critical' : row.percent < 60 ? 'warning' : 'nominal'}
                icon={Icon}
                color={row.barColor}
                subtext={`Days Remaining: ${row.daysLeft} (Stock Level: ${row.percent}%)`}
                details={row.details || [
                  { label: 'Remaining Stock', value: row.amount, color: row.barColor },
                  { label: 'Days Remaining', value: row.daysLeft, color: '#146b80' },
                  { label: 'Capacity Level', value: `${row.percent}%`, color: row.barColor }
                ]}
                interpretation={row.interpretation}
                recommendation={row.recommendation}
                stationName={selectedStation}
                className="logistics-row-wrapper"
              >
                <div className="logistics-row">
                  {/* Item Label & Icon */}
                  <div className="log-col-item">
                    <Icon size={14} style={{ color: row.iconColor }} className="log-item-icon" />
                    <span className="log-item-name">{row.name}</span>
                  </div>

                  {/* Amount & Progress Bar */}
                  <div className="log-col-remaining">
                    <span className="log-amount-text mono-num">{row.amount}</span>
                    <div className="log-progress-track">
                      <div 
                        className="log-progress-fill" 
                        style={{ 
                          width: `${row.percent}%`,
                          backgroundColor: row.barColor 
                        }} 
                      />
                    </div>
                  </div>

                  {/* Days Remaining */}
                  <div className="log-col-days">
                    <span className="log-days-text mono-num">{row.daysLeft}</span>
                  </div>
                </div>
              </ExpandableTelemetryCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
