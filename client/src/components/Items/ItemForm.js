import React, { useState, useMemo, useCallback } from 'react';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import {
  FormGroup,
  MenuItem,
  Intent,
  InputGroup,
  HTMLSelect,
  Button,
  Classes,
} from '@blueprintjs/core';
import { Row, Col } from 'react-grid-system';
import { Select } from '@blueprintjs/select';
import AppToaster from 'components/AppToaster';
import AccountsConnect from 'connectors/Accounts.connector';
import ItemsConnect from 'connectors/Items.connect';
import {compose} from 'utils';
import ErrorMessage from 'components/ErrorMessage';
import classNames from 'classnames';
import Icon from 'components/Icon';


const ItemForm = ({
  requestSubmitItem,
  accounts,
}) => {
  const [selectedAccounts, setSelectedAccounts] = useState({});

  const ItemTypeDisplay = useMemo(() => ([
    { value: null, label: 'Select Item Type' },
    { value: 'service', label: 'Service' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'non-inventory', label: 'Non-Inventory' }
  ]), []);

  const validationSchema = Yup.object().shape({
    name: Yup.string().required(),
    type: Yup.string().trim().required(),
    sku: Yup.string().required(),
    cost_price: Yup.number().required(),
    sell_price: Yup.number().required(),
    cost_account_id: Yup.number().required(),
    sell_account_id: Yup.number().required(),
    inventory_account_id: Yup.number().required(),
    category_id: Yup.number().required(),
    stock: Yup.string() || Yup.boolean()
  });

  const initialValues = useMemo(() => ({
    name: '',
    type: '',
    sku: '',
    cost_price: null,
    sell_price: null,
    cost_account_id: null,
    sell_account_id: null,
    inventory_account_id: null,
    category_id: null,
    note: '',
  }), []);

  const formik = useFormik({
    enableReinitialize: true,
    validationSchema: validationSchema,
    initialValues: {
      ...initialValues,
    },
    onSubmit: (values, { setSubmitting }) => {
      requestSubmitItem(values).then((response) => {
        AppToaster.show({
          message: 'The_Items_has_been_Submit'
        });
        setSubmitting(false);
      })
      .catch((error) => {
        setSubmitting(false);
      });
    }
  });
  const {errors, values, touched} = useMemo(() => formik, [formik]);

  const accountItem = (item, { handleClick }) => (
    <MenuItem key={item.id} text={item.name} label={item.code} onClick={handleClick} />
  );
  // Filter Account Items
  const filterAccounts = (query, account, _index, exactMatch) => {
    const normalizedTitle = account.name.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    if (exactMatch) {
      return normalizedTitle === normalizedQuery;
    } else {
      return `${account.code} ${normalizedTitle}`.indexOf(normalizedQuery) >= 0;
    }
  };

  const onItemAccountSelect = useCallback((filedName) => {
    return (account) => {
      setSelectedAccounts({
        ...selectedAccounts,
        [filedName]: account
      });
      formik.setFieldValue(filedName, account.id);
    };
  }, [formik, selectedAccounts]);

  const getSelectedAccountLabel = useCallback((fieldName, defaultLabel) => {
    return typeof selectedAccounts[fieldName] !== 'undefined'
      ? selectedAccounts[fieldName].name : defaultLabel;
  }, [selectedAccounts]);

  const requiredSpan = useMemo(() => (<span class="required">*</span>), []);
  const infoIcon = useMemo(() => (<Icon icon="info-circle" iconSize={12} />), []);

  return (
    <div class='item-form'>
      <form onSubmit={formik.handleSubmit}>
        <div class="item-form__primary-section">
          <FormGroup
            medium={true}
            label={'Item Type'}
            labelInfo={requiredSpan}
            className={'form-group--item-type'}
            intent={(errors.type && touched.type) && Intent.DANGER}
            helperText={<ErrorMessage {...formik} name="type" />}
            inline={true}
          >
            <HTMLSelect
              fill={true}
              options={ItemTypeDisplay}
              {...formik.getFieldProps('type')}
            />
          </FormGroup>

          <FormGroup
            label={'Item Name'}
            labelInfo={requiredSpan}
            className={'form-group--item-name'}
            intent={(errors.name && touched.name) && Intent.DANGER}
            helperText={<ErrorMessage {...formik} name="name" />}
            inline={true}
          >
            <InputGroup
              medium={true}
              intent={(errors.name && touched.name) && Intent.DANGER}
              {...formik.getFieldProps('name')}
            />
          </FormGroup>

          <FormGroup
            label={'SKU'}
            labelInfo={infoIcon}
            className={'form-group--item-sku'}
            intent={(errors.sku && touched.sku) && Intent.DANGER}
            helperText={<ErrorMessage {...formik} name="sku" />}
            inline={true}
          >
            <InputGroup
              medium={true}
              intent={(errors.sku && touched.sku) && Intent.DANGER}
              {...formik.getFieldProps('sku')}
            />
          </FormGroup>

          <FormGroup
            label={'Category'}
            labelInfo={infoIcon}
            inline={true}
            intent={(errors.category_id && touched.category_id) && Intent.DANGER}
            helperText={<ErrorMessage {...formik} name="category" />}
            className={classNames(
              'form-group--select-list',
              'form-group--category',
              Classes.FILL,
            )}
          >
            <Select
              items={accounts}
              itemRenderer={accountItem}
              itemPredicate={filterAccounts}
              popoverProps={{ minimal: true }}
              onItemSelect={onItemAccountSelect('category_id')}
            >
              <Button
                fill={true}
                rightIcon='caret-down'
                text={getSelectedAccountLabel('category_id', 'Select account')}
              />
            </Select>
          </FormGroup>
        </div>

        <Row gutterWidth={16} className={'item-form__accounts-section'}>
          <Col width={404}>
            <h4 >Purchase Information</h4>

            <FormGroup
              label={'Selling Price'}
              className={'form-group--item-selling-price'}
              intent={(errors.selling_price && touched.selling_price) && Intent.DANGER}
              helperText={<ErrorMessage {...formik} name="selling_price" />}
              inline={true}
            >
              <InputGroup
                medium={true}
                intent={(errors.selling_price && touched.selling_price) && Intent.DANGER}
                {...formik.getFieldProps('sell_price')}
              />
            </FormGroup>

            <FormGroup
              label={'Account'}
              labelInfo={infoIcon}
              inline={true}
              intent={(errors.sell_account_id && touched.sell_account_id) && Intent.DANGER}
              helperText={<ErrorMessage {...formik} name="sell_account_id" />}
              className={classNames(
                'form-group--sell-account',
                'form-group--select-list',
                Classes.FILL)}
            >
              <Select
                items={accounts}
                itemRenderer={accountItem}
                itemPredicate={filterAccounts}
                popoverProps={{ minimal: true }}
                onItemSelect={onItemAccountSelect('sell_account_id')}
              >
                <Button
                  fill={true}
                  rightIcon='caret-down'
                  text={getSelectedAccountLabel('sell_account_id', 'Select account')}
                />
              </Select>
            </FormGroup>
          </Col>

          <Col width={404}>
            <h4>Sales Information</h4>

            <FormGroup
              label={'Cost Price'}
              className={'form-group--item-cost-price'}
              intent={(errors.cost_price && touched.cost_price) && Intent.DANGER}
              helperText={<ErrorMessage {...formik} name="cost_price" />}
              inline={true}
            >
              <InputGroup
                medium={true}
                intent={(errors.cost_price && touched.cost_price) && Intent.DANGER}
                {...formik.getFieldProps('cost_price')}
              />
            </FormGroup>

            <FormGroup
              label={'Account'}
              labelInfo={infoIcon}
              inline={true}
              intent={(errors.cost_account_id && touched.cost_account_id) && Intent.DANGER}
              helperText={<ErrorMessage {...formik} name="cost_account_id" />}
              className={classNames(
                'form-group--cost-account',
                'form-group--select-list',
                Classes.FILL)}
            >
              <Select
                items={accounts}
                itemRenderer={accountItem}
                itemPredicate={filterAccounts}
                popoverProps={{ minimal: true }}
                onItemSelect={onItemAccountSelect('cost_account_id')}
              >
                <Button
                  fill={true}
                  rightIcon='caret-down'
                  text={getSelectedAccountLabel('cost_account_id', 'Select account')}
                />
              </Select>
            </FormGroup>
          </Col>
        </Row>

        <Row className={'item-form__accounts-section mt2'}>
          <Col width={404}>
            <h4>Inventory Information</h4>

            <FormGroup
              label={'Inventory Account'}
              inline={true}
              intent={(errors.inventory_account_id && errors.inventory_account_id) && Intent.DANGER}
              helperText={<ErrorMessage {...formik} name="inventory_account_id" />}
              className={classNames(
                'form-group--item-inventory_account',
                'form-group--select-list',
                Classes.FILL)}
              >
              <Select
                items={accounts}
                itemRenderer={accountItem}
                itemPredicate={filterAccounts}
                popoverProps={{ minimal: true }}
                onItemSelect={onItemAccountSelect('inventory_account_id')}
              >
                <Button
                  fill={true}
                  rightIcon='caret-down'
                  text={getSelectedAccountLabel('inventory_account_id','Select account')}
                />
              </Select>
            </FormGroup>

            <FormGroup
              label={'Opening Stock'}
              className={'form-group--item-stock'}
              intent={formik.errors.cost_price && Intent.DANGER}
              helperText={formik.errors.stock && formik.errors.stock}
              inline={true}
            >
              <InputGroup
                medium={true}
                intent={formik.errors.stock && Intent.DANGER}
                {...formik.getFieldProps('stock')}
              />
            </FormGroup>
          </Col>
        </Row>

        <div class='form__floating-footer'>
          <Button intent={Intent.PRIMARY} type='submit'>
            Save
          </Button>

          <Button className={'ml1'}>Save as Draft</Button>
          <Button className={'ml1'} onClick={'handleClose'}>Close</Button>
        </div>
      </form>
    </div>
  );
};

export default compose(
  AccountsConnect,
  ItemsConnect,
)(ItemForm);